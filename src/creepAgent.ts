import { sequence, action, withTarget, selector, condition } from './behaviorTree';
import {
  TransferEnergy,
  MoveToTarget,
  Harvest,
  HasFreeCapacity,
  HasUsedCapacity,
  CreepBehaviorTree,
  nearest,
  roomController,
} from './creepBehavior';
import { UpgradeController } from './creepBehavior/actions/UpgradeController';
import { TargetHasFreeCapacity } from './creepBehavior/conditions/TargetHasFreeCapacity';

declare global {
  interface CreepMemory {
    bt: NodeMemory;
  }
}

// prettier-ignore
const buildWorkerTree = selector([
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
      condition(TargetHasFreeCapacity),
      action(MoveToTarget),
      action(TransferEnergy),
    ]),
  ),
  withTarget(
    roomController(),
    sequence([
      condition(HasUsedCapacity, RESOURCE_ENERGY),
      action(MoveToTarget, 3),
      action(UpgradeController),
    ]),
  ),
])

const treesById = new Map<string, CreepBehaviorTree>();

export function runCreep(creep: Creep) {
  if (!treesById.has(creep.id)) {
    const tree = new CreepBehaviorTree(creep, buildWorkerTree);
    treesById.set(creep.id, tree);
  }
  treesById.get(creep.id)!.step();
}

export function cleanupDeadCreeps() {
  for (const id of treesById.keys()) {
    if (!Game.getObjectById(id as Id<Creep>)) {
      treesById.delete(id);
    }
  }

  for (const name in Memory.creeps) {
    const creep = Game.creeps[name];
    if (!creep) {
      delete Memory.creeps[name];
    }
  }
}
