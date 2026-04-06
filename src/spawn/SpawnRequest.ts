import { TaskListMemory } from '../taskList';

export interface SpawnRequest {
  role: string;
  assignmentKey: string;
  assignment: any;
  bodyParts: BodyPartConstant[];
  energyRequirement: number;
}

declare global {
  interface Memory {
    spawnQueues: Record<string, TaskListMemory<SpawnRequest>>;
  }
}
