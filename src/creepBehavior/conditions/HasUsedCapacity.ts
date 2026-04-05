import { CreepCondition } from '../CreepCondition';

export class HasUsedCapacity extends CreepCondition {
  constructor(
    protected getMemory: () => NodeMemory,
    protected agent: Id<Creep>,
    protected resource?: ResourceConstant,
  ) {
    super(getMemory, agent);
  }

  checkCreep(creep: Creep) {
    return creep.store.getUsedCapacity(this.resource) > 0;
  }
}
