import { selector, sequence, action, condition, withTarget, flip } from '../behaviorTree';
import {
  TransferEnergy,
  MoveToTarget,
  HasFreeCapacity,
  HasUsedCapacity,
  assignedPos,
  assignedSource as _assignedSource,
  Pickup,
  nearest,
  TargetHasFreeCapacity,
  nearestSpawnEnergyNeed,
  nearestCreepEnergyNeed,
  IsEmpty,
  nearestAroundAssignment,
  MoveToTargetRoom,
  NotInCityMainRoom,
} from '../creepBehavior';
import { Role, scaleBody } from './Role';
import { SerializedPos } from '../utils/pos';
import { cityCenter } from '../creepBehavior/targets/cityCenter';
import { droppedAroundAssignment } from '../creepBehavior/targets/droppedAroundAssignment';
import { AssignmentIsInAnotherRoom } from '../creepBehavior/conditions/AssignmentIsInAnotherRoom';

export interface HaulerAssignment {
  sourceId: string;
  pos: SerializedPos;
}

const UNIT: BodyPartConstant[] = [CARRY, CARRY, MOVE];
const MAX_UNITS = 4;

const transferEnergyToTarget = sequence<Id<Creep>, CreepContext>([
  condition(HasUsedCapacity, RESOURCE_ENERGY),
  condition(TargetHasFreeCapacity, RESOURCE_ENERGY),
  action(MoveToTarget),
  action(TransferEnergy),
]);

// prettier-ignore
const tree = selector<Id<Creep>, CreepContext>([
  sequence([
    condition(IsEmpty),
    condition(AssignmentIsInAnotherRoom),
    withTarget(
      assignedPos(),
      action(MoveToTarget,2),
    ),
  ]),
  sequence([
    condition(IsEmpty),
    condition(AssignmentIsInAnotherRoom),
    withTarget(
      assignedPos(),
      action(MoveToTargetRoom),
    ),
  ]),

  sequence([
    condition(HasFreeCapacity),
    flip(condition(AssignmentIsInAnotherRoom)),
    withTarget(
      droppedAroundAssignment(),
      sequence([
        action(MoveToTarget),
        action(Pickup),
      ]),
    ),
  ]),

  sequence([
    condition(NotInCityMainRoom),
    withTarget(
      cityCenter(),
      action(MoveToTargetRoom),
    ),
  ]),

  withTarget(
    nearestSpawnEnergyNeed(),
    transferEnergyToTarget,
  ),
  withTarget(
    nearestCreepEnergyNeed(),
    transferEnergyToTarget,
  ),
  sequence([
    condition(HasUsedCapacity),
    withTarget(
      cityCenter(),
      action(MoveToTarget, 10),
    ),
  ]),
]);

export const haulerRole: Role<HaulerAssignment> = {
  name: 'hauler',
  buildBody: (energy) => scaleBody(UNIT, energy, MAX_UNITS),
  buildTree: tree,
  buildMemory: (assignment) => ({
    assignedSource: assignment.sourceId as Id<Source>,
    assignedPos: assignment.pos,
  }),
};
