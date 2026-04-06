import { TaskList } from '../taskList/TaskList';
import { TaskListMemory } from '../taskList/Task';
import { CityInfo } from './CityInfo';
import { Stamp } from './stamps/Stamp';
import { getBuildingEntries, translateCoord } from './stamps/utils';
import { BuildTask } from './BuildTask';
import { StampPlacer, StampPlacement } from './StampPlacer';

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

interface PlannedBuilding {
  type: BuildableStructureConstant;
  pos: RoomCoord;
  minRcl: number;
}

interface RoomPlanMemory {
  plan: PlannedBuilding[];
  buildTasks: TaskListMemory<BuildTask>;
  lastRcl: number;
}

declare global {
  interface Memory {
    roomPlans: Record<string, RoomPlanMemory>;
  }
}

// ---------------------------------------------------------------------------
// RoomPlanner
// ---------------------------------------------------------------------------

export class RoomPlanner {
  private plan: PlannedBuilding[];
  private buildTasks: TaskList<BuildTask>;
  private lastRcl: number;

  constructor(
    private roomName: string,
    private cityInfo: CityInfo,
    private stamps: Stamp[],
  ) {
    if (!Memory.roomPlans) Memory.roomPlans = {};
    if (!Memory.roomPlans[roomName]) {
      Memory.roomPlans[roomName] = { plan: [], buildTasks: { tasks: {}, nextId: 0 }, lastRcl: 0 };
    }

    this.plan = this.mem.plan;
    this.lastRcl = this.mem.lastRcl;
    this.buildTasks = new TaskList<BuildTask>(() => this.mem.buildTasks);

    if (this.plan.length === 0) {
      this.computePlan();
    }
  }

  update(): void {
    const room = Game.rooms[this.roomName];
    if (!room?.controller) return;

    this.visualize(room);

    const currentRcl = room.controller.level;
    if (currentRcl === this.lastRcl) return;

    this.enqueueBuildTasksForRcl(room, currentRcl);
    this.lastRcl = currentRcl;
    this.apply();
  }

  getBuildTaskList(): TaskList<BuildTask> {
    return this.buildTasks;
  }

  visualize(room: Room): void {
    const visual = room.visual;
    for (const building of this.plan) {
      visual.structure(building.pos.x, building.pos.y, building.type, { opacity: 0.5 });
    }
    visual.connectRoads({ opacity: 0.5 });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private get mem(): RoomPlanMemory {
    return Memory.roomPlans[this.roomName]!;
  }

  private computePlan(): void {
    const room = Game.rooms[this.roomName];
    if (!room) return;

    const placements = new StampPlacer(room, this.cityInfo).place(this.stamps);

    this.plan = [];
    const seen = new Set<string>();
    for (const placement of placements) {
      this.expandStampIntoPlan(placement, seen);
    }

    this.apply();
  }

  /**
   * Add build tasks for all planned buildings that are now unlocked by `currentRcl`
   * and not already in the task queue or built in the room.
   */
  private enqueueBuildTasksForRcl(room: Room, currentRcl: number): void {
    const enqueuedKeys = new Set(this.buildTasks.all().map((t) => buildingKey(t.data.type, t.data.pos)));

    for (const building of this.plan) {
      if (building.minRcl > currentRcl) continue;
      if (enqueuedKeys.has(buildingKey(building.type, building.pos))) continue;
      const alreadyBuilt = room
        .lookForAt(LOOK_STRUCTURES, building.pos.x, building.pos.y)
        .some((s) => s.structureType === building.type);
      if (alreadyBuilt) continue;
      this.buildTasks.add({ type: building.type, pos: building.pos }, 8 - building.minRcl);
    }
  }

  /**
   * Translate all buildings from a stamp placement into absolute room coordinates
   * and append them to the plan, skipping duplicates via `seen`.
   */
  private expandStampIntoPlan(placement: StampPlacement, seen: Set<string>): void {
    const { stamp, anchorRoomPos, rotation } = placement;

    for (const step of stamp.steps) {
      for (const { type, coord } of getBuildingEntries(step)) {
        const rc = translateCoord(coord, stamp.anchor, anchorRoomPos, rotation);
        const pos: RoomCoord = { x: rc.x, y: rc.y, room: this.roomName };
        const key = buildingKey(type, pos);
        if (seen.has(key)) continue;
        seen.add(key);
        this.plan.push({ type, pos, minRcl: step.rcl });
      }
    }
  }

  private apply(): void {
    this.mem.plan = this.plan;
    this.mem.lastRcl = this.lastRcl;
    this.buildTasks.apply();
  }
}

function buildingKey(type: BuildableStructureConstant, pos: RoomCoord): string {
  return `${type}-${pos.x}-${pos.y}`;
}
