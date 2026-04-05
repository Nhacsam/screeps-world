import { sequence, action, withTarget } from './behaviorTree';
import { Harvest } from './creepBahavior/actions/Harvest';
import { MoveToTarget } from './creepBahavior/actions/MoveToTarget';
import { TransferEnergy } from './creepBahavior/actions/TransferEnergy';
import { CreepBehaviorTree } from './creepBahavior/CreepBehaviorTree';
import { nearest } from './creepBahavior/targets/nearest';

declare global {
  interface CreepMemory {
    bt: NodeMemory;
  }
}

// prettier-ignore
const buildWorkerTree = sequence([
  withTarget(
    sequence([
      action(MoveToTarget),
      action(Harvest),
    ]),
    nearest(FIND_SOURCES),
  ),
  withTarget(
    sequence([
      action(MoveToTarget),
      action(TransferEnergy),
    ]),
    nearest(FIND_MY_SPAWNS),
  ),
])

const treesById = new Map<string, CreepBehaviorTree>();

export function runCreep(creep: Creep) {
  if (!treesById.has(creep.id)) {
    const tree = new CreepBehaviorTree(creep, buildWorkerTree as any);
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
