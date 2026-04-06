import { selector, sequence, action, condition, withTarget } from '../behaviorTree';
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
  IsFull,
  nearestCreepEnergyNeed,
} from '../creepBehavior';
import { CityInfo } from '../room/CityInfo';
import { fromPos } from '../utils/pos';
import { Role, scaleBody } from './Role';
import { SpawnRequirement } from '../spawn/SpawnRequirement';
import { SerializedPos } from '../utils/pos';

export interface HaulerAssignment {
  sourceId: string;
  pos: SerializedPos;
  index: number;
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
const tree = selector([
  withTarget(
    nearest(FIND_DROPPED_RESOURCES),
    sequence([
      condition(HasFreeCapacity),
      action(MoveToTarget),
      action(Pickup),
    ]),
  ),
  withTarget(
    nearestSpawnEnergyNeed(),
    transferEnergyToTarget,
  ),
  withTarget(
    nearestCreepEnergyNeed(),
    transferEnergyToTarget,
  ),
  withTarget(
    nearest(FIND_MY_SPAWNS),
    sequence([
      condition(IsFull),
      action(MoveToTarget, 3),
    ]),
  ),
  withTarget(
    assignedPos(),
    action(MoveToTarget, 3),
  ),
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

export function haulerRequirement(priority: number = 0): SpawnRequirement<HaulerAssignment> {
  return {
    role: haulerRole,
    priority,
    getDesiredAssignments: (city: CityInfo) =>
      city
        .getAllSources()
        .filter((s) => s.harvesterPos.length > 0)
        .reduce<HaulerAssignment[]>((acc, s) => {
          acc.push({ sourceId: s.id as string, pos: fromPos(s.harvesterPos[0]!), index: 0 });
          acc.push({ sourceId: s.id as string, pos: fromPos(s.harvesterPos[0]!), index: 1 });
          return acc;
        }, []),
    assignmentKey: (a) => `${a.sourceId}-${a.index}`,
  };
}
