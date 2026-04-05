import { CreepCondition } from '../CreepCondition';

export class IsFull extends CreepCondition {
  constructor(
    protected memory: NodeMemory,
    protected agent: Id<Creep>,
  ) {
    super(memory, agent);
  }

  checkCreep(creep: Creep) {
    return creep.store.getFreeCapacity() === 0;
  }
}
