import { sequence, action, withTarget, selector, condition } from './behaviorTree';
import { Harvest } from './creepBehavior/actions/Harvest';
import { MoveToTarget } from './creepBehavior/actions/MoveToTarget';
import { TransferEnergy } from './creepBehavior/actions/TransferEnergy';
import { HasFreeCapacity, HasUsedCapacity } from './creepBehavior/conditions';
import { CreepBehaviorTree } from './creepBehavior/CreepBehaviorTree';
import { nearest } from './creepBehavior/targets/nearest';

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
      action(MoveToTarget),
      action(TransferEnergy),
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
