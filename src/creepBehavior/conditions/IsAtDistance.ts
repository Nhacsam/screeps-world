import { WithTarget } from '../../behaviorTree';
import { CreepCondition } from '../CreepCondition';

export class IsAtDistance extends CreepCondition {
  constructor(
    protected getMemory: () => NodeMemory,
    protected agent: Id<Creep>,
    protected distance: number,
  ) {
    super(getMemory, agent);
  }

  checkCreep(creep: Creep, context: CreepContext) {
    const target = WithTarget.resolveTarget(context.target);

    if (!target) {
      return false;
    }

    return creep.pos.getRangeTo(target) <= this.distance;
  }
}
