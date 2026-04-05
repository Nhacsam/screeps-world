import { WithTarget } from '../../behaviorTree';
import { CreepCondition } from '../CreepCondition';

export class TargetIsFull extends CreepCondition {
  constructor(
    protected memory: NodeMemory,
    protected agent: Id<Creep>,
    protected resource?: ResourceConstant,
  ) {
    super(memory, agent);
  }

  checkCreep(_creep: Creep, context: CreepContext) {
    const target = WithTarget.resolveTarget(context.target);

    if (!target || !('store' in target)) {
      return false;
    }

    const store = target.store as StoreDefinition;
    return store.getFreeCapacity(this.resource) === 0;
  }
}
