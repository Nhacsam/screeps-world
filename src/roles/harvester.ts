import { action, sequence, withTarget } from '../behaviorTree';
import { SerializedPos } from '../utils/pos';
import { Role } from './Role';
import { assignedPos, assignedSource, Harvest, MoveToTarget } from '../creepBehavior';

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
  buildTree: tree,
  buildMemory: (assignment) => ({
    assignedSource: assignment.sourceId as Id<Source>,
    assignedPos: assignment.pos,
  }),
};
