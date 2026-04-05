import { CreepCondition } from '../CreepCondition';

export class HasFreeCapacity extends CreepCondition {
  constructor(
    protected memory: NodeMemory,
    protected agent: Id<Creep>,
    protected resource?: ResourceConstant,
  ) {
    super(memory, agent);
  }

  checkCreep(creep: Creep) {
    return creep.store.getFreeCapacity(this.resource) > 0;
  }
}
