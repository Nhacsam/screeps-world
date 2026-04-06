import { Task, TaskListMemory } from './Task';
import { TaskState } from './TaskState';

const DEFAULT_RESERVATION_TTL = 10;

/**
 * Generic persistent task queue with an in-process cache.
 * All reads and writes operate on the cache; mutations call apply() automatically.
 *
 * Usage:
 *   declare global { interface Memory { haulQueue: TaskListMemory<HaulTask>; } }
 *   if (!Memory.haulQueue) Memory.haulQueue = { tasks: {}, nextId: 0 };
 *   const haulQueue = new TaskList(() => Memory.haulQueue);
 */
export class TaskList<T> {
  private tasks: Record<string, Task<T>> = {};
  private nextId: number = 0;

  /**
   * @param getMemory       Factory called on each apply() to get the fresh Memory slice.
   * @param reservationTTL  Ticks before an unfinished reservation is stale. Default: 100.
   */
  constructor(
    private getMemory?: () => TaskListMemory<T>,
    private reservationTTL: number = DEFAULT_RESERVATION_TTL,
  ) {
    if (getMemory) {
      const memory = getMemory();
      this.tasks = JSON.parse(JSON.stringify(memory.tasks)) as Record<string, Task<T>>;
      this.nextId = memory.nextId;
    }
  }

  /**
   * Flush the in-process cache to Memory.
   * Calls getMemory() to obtain the fresh tick's reference — O(1), no copying.
   */
  apply(): void {
    if (!this.getMemory) {
      return;
    }
    const memory = this.getMemory();
    memory.tasks = this.tasks;
    memory.nextId = this.nextId;
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  /** Add a new task. Returns the created task. */
  add(data: T, priority: number = 0, reservationTTL?: number): Task<T> {
    const id = String(this.nextId++);
    const task: Task<T> = {
      id,
      data,
      priority,
      state: TaskState.PENDING,
      createdAt: Game.time,
      ...(reservationTTL !== undefined && { reservationTTL }),
    };
    this.tasks[id] = task;
    this.apply();
    return task;
  }

  getFirstTask() {
    const task = this.getPending()[0];
    if (!task) return undefined;
    return task;
  }

  /**
   * Reserve the highest-priority PENDING task for an agent.
   * If the agent already holds a task, that task is returned instead.
   * Returns undefined when no pending task is available.
   */
  reserve(agentId: string): Task<T> | undefined {
    const existing = this.getByAgent(agentId);
    if (existing) return existing;

    const task = this.getPending()[0];
    if (!task) return undefined;

    return this._claim(task, agentId);
  }

  /**
   * Reserve a specific task by ID for an agent.
   * Returns the task if successful, undefined if not available.
   */
  reserveById(taskId: string, agentId: string): Task<T> | undefined {
    const task = this.get(taskId);
    if (!task || task.state !== TaskState.PENDING) return undefined;
    return this._claim(task, agentId);
  }

  /** Release a reservation back to PENDING. */
  release(taskId: string): void {
    const task = this.get(taskId);
    if (!task || task.state !== TaskState.RESERVED) return;

    task.state = TaskState.PENDING;
    delete task.reservedBy;
    delete task.reservedAt;
    this.apply();
  }

  /** Mark a reserved (or pending) task as successfully completed. */
  markAsDone(taskId: string): void {
    const task = this.get(taskId);
    if (!task) return;

    task.state = TaskState.DONE;
    delete task.reservedBy;
    delete task.reservedAt;
    this.apply();
  }

  /**
   * Mark a task as failed.
   * Failed tasks stay in the list and can be re-queued via requeue() or
   * cleaned up via cleanup().
   */
  markAsFailed(taskId: string): void {
    const task = this.get(taskId);
    if (!task) return;

    task.state = TaskState.FAILED;
    delete task.reservedBy;
    delete task.reservedAt;
    this.apply();
  }

  /** Re-queue a FAILED task back to PENDING. */
  requeue(taskId: string): void {
    const task = this.get(taskId);
    if (!task || task.state !== TaskState.FAILED) return;

    task.state = TaskState.PENDING;
    this.apply();
  }

  /** Remove a task entirely regardless of state. */
  remove(taskId: string): void {
    delete this.tasks[taskId];
    this.apply();
  }

  /** Change the priority of a task. */
  prioritize(taskId: string, priority: number): void {
    const task = this.get(taskId);
    if (!task) return;
    task.priority = priority;
    this.apply();
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /** Get a single task by ID. */
  get(taskId: string): Task<T> | undefined {
    return this.tasks[taskId];
  }

  /** Get the task currently reserved by an agent, if any. */
  getByAgent(agentId: string): Task<T> | undefined {
    return this._values().find((t) => t.reservedBy === agentId);
  }

  /**
   * Get all PENDING tasks sorted by descending priority
   * (highest priority first, ties broken by oldest creation time).
   */
  getPending(): Task<T>[] {
    return this._values()
      .filter((t) => t.state === TaskState.PENDING)
      .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
  }

  /** Get all RESERVED tasks. */
  getReserved(): Task<T>[] {
    return this._values().filter((t) => t.state === TaskState.RESERVED);
  }

  /** Get all FAILED tasks. */
  getFailed(): Task<T>[] {
    return this._values().filter((t) => t.state === TaskState.FAILED);
  }

  /** Get all tasks regardless of state. */
  all(): Task<T>[] {
    return this._values();
  }

  pendingCount(): number {
    return this._values().filter((t) => t.state === TaskState.PENDING).length;
  }

  size(): number {
    return Object.keys(this.tasks).length;
  }

  // ---------------------------------------------------------------------------
  // Maintenance
  // ---------------------------------------------------------------------------

  /**
   * Release reservations held by agents that are no longer alive.
   * By default checks both Game.getObjectById and Game.creeps.
   * Pass a custom isAlive predicate for non-standard agent IDs.
   * Returns the number of reservations released.
   */
  pruneStaleReservations(isAlive: (agentId: string) => boolean = defaultIsAlive): number {
    let count = 0;
    const now = Game.time;

    for (const task of this.getReserved()) {
      const ttl = task.reservationTTL ?? this.reservationTTL;
      const timedOut = task.reservedAt !== undefined && now - task.reservedAt > ttl;
      const agentDead = task.reservedBy !== undefined && !isAlive(task.reservedBy);

      if (timedOut || agentDead) {
        this.release(task.id);
        count++;
      }
    }

    this.apply();
    return count;
  }

  /**
   * Remove all DONE (and optionally FAILED) tasks from the cache.
   * Returns the number of tasks removed.
   */
  cleanup(includeFailed: boolean = false): number {
    let count = 0;
    for (const task of this._values()) {
      if (task.state === TaskState.DONE || (includeFailed && task.state === TaskState.FAILED)) {
        delete this.tasks[task.id];
        count++;
      }
    }
    this.apply();
    return count;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _values(): Task<T>[] {
    return Object.values(this.tasks);
  }

  private _claim(task: Task<T>, agentId: string): Task<T> {
    task.state = TaskState.RESERVED;
    task.reservedBy = agentId;
    task.reservedAt = Game.time;
    this.apply();
    return task;
  }
}

function defaultIsAlive(agentId: string): boolean {
  return !!(Game.getObjectById(agentId as Id<any>) ?? Game.creeps[agentId]);
}
