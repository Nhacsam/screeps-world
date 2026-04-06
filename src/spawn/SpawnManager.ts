import { TaskList } from '../taskList';
import { CityInfo } from '../room/CityInfo';
import { Role } from '../roles/Role';
import { SerializedPos } from '../utils/pos';
import { SpawnRequest } from './SpawnRequest';
import { RequirementBuilder, SpawnRequirement } from './SpawnRequirement';

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
    private requirementBuilders: RequirementBuilder<any>[],
    private roles: Map<string, Role<any>>,
  ) {
    this.queue = new TaskList();
  }

  update(): void {
    this.queue.cleanup();
    // console.log(JSON.stringify(this.queue.all(), undefined, 2));
    this.updateQueue();
    this.processSpawns();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private updateQueue(): void {
    const cityName = this.city.getMainRoomName();
    const aliveCreeps = Object.values(Game.creeps).filter((c) => c.memory.city === cityName);

    let requirements: SpawnRequirement[] = [];

    for (const builder of this.requirementBuilders) {
      const newRequirements = builder.buildRequirement(this.city);
      if (!newRequirements) continue;
      requirements = requirements.concat(newRequirements);
    }

    const desiredKeys = new Set<string>(requirements.map((r) => r.assignmentKey));

    // Drop queued tasks whose assignment is no longer desired
    for (const task of this.queue.getPending()) {
      if (!desiredKeys.has(task.data.assignmentKey)) {
        this.queue.remove(task.id);
      }
    }

    // Enqueue missing assignments
    for (const req of requirements) {
      const fulfilled = aliveCreeps.some(
        (c) => c.memory.role === req.role.name && c.memory.assignment === req.assignmentKey,
      );
      if (fulfilled) continue;

      const queued = this.queue
        .all()
        .some((t) => t.data.role === req.role.name && t.data.assignmentKey === req.assignmentKey);
      if (queued) continue;

      this.queue.add(
        {
          role: req.role.name,
          assignmentKey: req.assignmentKey,
          assignment: req.assignment,
          bodyParts: req.bodyParts,
          energyRequirement: req.energyRequirement,
        },
        req.priority,
      );
    }
  }

  private processSpawns(): void {
    const cityName = this.city.getMainRoomName();

    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName]!;
      if (spawn.spawning) continue;
      if (spawn.room.name !== cityName) continue;

      const task = this.queue.getFirstTask();
      if (!task) continue;

      if (spawn.room.energyAvailable < (task.data.energyRequirement || 300)) {
        continue;
      }

      this.queue.reserveById(task.id, spawnName);

      const role = this.roles.get(task.data.role);
      if (!role) {
        this.queue.markAsFailed(task.id);
        continue;
      }

      const assignment = task.data.assignment;
      const body = task.data.bodyParts;
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
        console.log(`[SpawnManager] Failed to spawn ${name}: ${result}`);
      }
    }
  }
}
