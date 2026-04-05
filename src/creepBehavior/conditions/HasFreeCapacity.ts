import { CreepCondition } from '../CreepCondition';

export class HasFreeCapacity extends CreepCondition {
  constructor(
    protected getMemory: () => NodeMemory,
    protected agent: Id<Creep>,
    protected resource?: ResourceConstant,
  ) {
    super(getMemory, agent);
  }

  checkCreep(creep: Creep) {
    return creep.store.getFreeCapacity(this.resource) > 0;
  }
}
