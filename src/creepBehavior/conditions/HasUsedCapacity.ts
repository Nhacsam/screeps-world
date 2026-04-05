import { CreepCondition } from '../CreepCondition';

export class HasUsedCapacity extends CreepCondition {
  constructor(
    protected memory: NodeMemory,
    protected agent: Id<Creep>,
    protected resource?: ResourceConstant,
  ) {
    super(memory, agent);
  }

  checkCreep(creep: Creep) {
    return creep.store.getUsedCapacity(this.resource) > 0;
  }
}
