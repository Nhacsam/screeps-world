import { action, sequence, withTarget } from '../behaviorTree';
import { CityInfo } from '../room/CityInfo';
import { fromPos, SerializedPos } from '../utils/pos';
import { Role, scaleBody } from './Role';
import { SpawnRequirement } from '../spawn/SpawnRequirement';
import { assignedPos, assignedSource, Harvest, MoveToTarget } from '../creepBehavior';

// No CARRY — stays at the assigned position and harvests in place.
const UNIT: BodyPartConstant[] = [WORK, MOVE];
const MAX_UNITS = 6;

export interface HarvesterAssignment {
  sourceId: string;
  pos: SerializedPos;
}

// prettier-ignore
const tree = sequence([
  withTarget(
    assignedPos(),
    action(MoveToTarget, 0),
  ),
  withTarget(
    assignedSource(),
    action(Harvest),
  ),
]);

export const harvesterRole: Role<HarvesterAssignment> = {
  name: 'harvester',
  buildBody: (energy) => scaleBody(UNIT, energy, MAX_UNITS),
  buildTree: tree,
  buildMemory: (assignment) => ({
    assignedSource: assignment.sourceId as Id<Source>,
    assignedPos: assignment.pos,
  }),
};

export function harvesterRequirement(priority: number = 0): SpawnRequirement<HarvesterAssignment> {
  return {
    role: harvesterRole,
    priority,
    getDesiredAssignments: (city: CityInfo) => {
      const assignments: HarvesterAssignment[] = [];
      for (const source of city.getAllSources()) {
        for (const pos of source.harvesterPos) {
          assignments.push({ sourceId: source.id as string, pos: fromPos(pos) });
        }
      }
      return assignments;
    },
    assignmentKey: (a) => `${a.sourceId}-${a.pos.x}-${a.pos.y}`,
  };
}
