import { TaskState } from './TaskState';

export interface Task<T> {
  id: string;
  data: T;
  /** Higher value = higher urgency. Default: 0. */
  priority: number;
  state: TaskState;
  reservedBy?: string;
  /** Game.time when the reservation was made. */
  reservedAt?: number;
  /** Overrides the TaskList-level reservationTTL for this specific task. */
  reservationTTL?: number;
  createdAt: number;
}

export interface TaskListMemory<T> {
  tasks: Record<string, Task<T>>;
  nextId: number;
}
