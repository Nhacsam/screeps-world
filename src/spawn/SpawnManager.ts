import { TaskList } from '../taskList';
import { CityInfo } from '../room/CityInfo';
import { Role } from '../roles/Role';
import { SerializedPos } from '../utils/pos';
import { SpawnRequest } from './SpawnRequest';
import { SpawnRequirement } from './SpawnRequirement';

declare global {
  interface CreepMemory {
    role: string;
    /** Name of the city this creep belongs to (for counting and assignment). */
    city: string;
    /** Stable deduplication key matching the SpawnRequirement's assignmentKey(). */
    assignment: string;
    bt: NodeMemory;
    // Role-specific optional fields:
    assignedSource?: Id<Source>;
    assignedPos?: SerializedPos;
  }
}

export class SpawnManager {
  private queue: TaskList<SpawnRequest>;

  constructor(
    private city: CityInfo,
    private requirements: SpawnRequirement<any>[],
    private roles: Map<string, Role<any>>,
  ) {
    const cityName = city.getMainRoomName();
    if (!Memory.spawnQueues) Memory.spawnQueues = {};
    if (!Memory.spawnQueues[cityName]) Memory.spawnQueues[cityName] = { tasks: {}, nextId: 0 };
    this.queue = new TaskList(() => Memory.spawnQueues[cityName]!);
  }

  update(): void {
    this.queue.cleanup();
    this.updateQueue();
    this.processSpawns();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private updateQueue(): void {
    const cityName = this.city.getMainRoomName();
    const aliveCreeps = Object.values(Game.creeps).filter((c) => c.memory.city === cityName);

    // Build the full desired set so we can remove stale queued tasks
    const desiredKeys = new Set<string>();
    for (const req of this.requirements) {
      for (const a of req.getDesiredAssignments(this.city)) {
        desiredKeys.add(`${req.role.name}:${req.assignmentKey(a)}`);
      }
    }

    // Drop queued tasks whose assignment is no longer desired
    for (const task of this.queue.getPending()) {
      if (!desiredKeys.has(`${task.data.role}:${task.data.assignmentKey}`)) {
        this.queue.remove(task.id);
      }
    }

    // Enqueue missing assignments
    for (const req of this.requirements) {
      for (const assignment of req.getDesiredAssignments(this.city)) {
        const key = req.assignmentKey(assignment);

        const fulfilled = aliveCreeps.some((c) => c.memory.role === req.role.name && c.memory.assignment === key);
        if (fulfilled) continue;

        const queued = this.queue.all().some((t) => t.data.role === req.role.name && t.data.assignmentKey === key);
        if (queued) continue;

        this.queue.add({ role: req.role.name, assignmentKey: key, assignment }, req.priority);
      }
    }
  }

  private processSpawns(): void {
    const cityName = this.city.getMainRoomName();

    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      if (spawn.spawning) continue;
      if (spawn.room.name !== cityName) continue;

      const task = this.queue.reserve(spawnName);
      if (!task) continue;

      const role = this.roles.get(task.data.role);
      if (!role) {
        this.queue.markAsFailed(task.id);
        continue;
      }

      const assignment = task.data.assignment;
      const body = role.buildBody(spawn.room.energyAvailable);
      const name = `${task.data.role}-${Game.time}`;
      const memory: CreepMemory = {
        ...role.buildMemory(assignment, cityName),
        role: task.data.role,
        city: cityName,
        assignment: task.data.assignmentKey,
        bt: {},
      };

      const result = spawn.spawnCreep(body, name, { memory });

      if (result === OK) {
        this.queue.markAsDone(task.id);
      } else if (result === ERR_NOT_ENOUGH_ENERGY) {
        this.queue.release(task.id);
      } else {
        this.queue.markAsFailed(task.id);
        console.error(`[SpawnManager] Failed to spawn ${name}: ${result}`);
      }
    }
  }
}
