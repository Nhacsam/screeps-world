import { selector, sequence, action, condition, withTarget } from '../behaviorTree';
import {
  TransferEnergy,
  MoveToTarget,
  Harvest,
  HasFreeCapacity,
  HasUsedCapacity,
  nearest,
  roomController,
  Pickup,
  preferedUpgradePos,
  nearestUnexploredRoom,
  MoveToTargetRoom,
  TriggerCityUpdate,
  UpgradeController,
  TargetHasFreeCapacity,
} from '../creepBehavior';
import { scaleBody } from '../spawnRequirements/scaleBody';
import { Role } from './Role';

const UNIT: BodyPartConstant[] = [WORK, CARRY, MOVE];
const MAX_UNITS = 5;

// prettier-ignore
const workerTree = selector([
  withTarget(
    nearest(FIND_DROPPED_RESOURCES),
    sequence([
      condition(HasFreeCapacity),
      action(MoveToTarget),
      action(Pickup),
    ]),
  ),
  withTarget(
    nearest(FIND_SOURCES),
    sequence([
      condition(HasFreeCapacity),
      action(MoveToTarget),
      action(Harvest),
    ]),
  ),
  withTarget(
    nearest(FIND_MY_SPAWNS),
    sequence([
      condition(HasUsedCapacity, RESOURCE_ENERGY),
      condition(TargetHasFreeCapacity, RESOURCE_ENERGY),
      action(MoveToTarget),
      action(TransferEnergy),
    ]),
  ),
  withTarget(
    nearestUnexploredRoom(),
    sequence([
      action(MoveToTargetRoom),
      action(TriggerCityUpdate),
    ]),
  ),
  withTarget(
    roomController(),
    sequence([
      condition(HasUsedCapacity, RESOURCE_ENERGY),
      withTarget(
        preferedUpgradePos(),
        action(MoveToTarget, 0),
      ),
      action(UpgradeController),
    ]),
  ),
]);

export const workerRole: Role<string> = {
  name: 'worker',
  buildBody: (energy) => scaleBody(UNIT, energy, MAX_UNITS),
  buildTree: workerTree,
  buildMemory: () => ({}),
};
