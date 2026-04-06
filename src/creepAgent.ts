import { CreepBehaviorTree } from './creepBehavior';
import { ROLES, workerRole } from './roles';

const treesById = new Map<string, CreepBehaviorTree>();

export function runCreep(creep: Creep) {
  if (!treesById.has(creep.id)) {
    // Legacy creeps (no city in memory) and unknown roles fall back to the worker tree.
    const role = creep.memory.city ? (ROLES.get(creep.memory.role) ?? workerRole) : workerRole;
    treesById.set(creep.id, new CreepBehaviorTree(creep, role.buildTree));
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
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
    }
  }
}
