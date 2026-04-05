import { State, WithTarget } from '../../behaviorTree';
import { CreepAction } from '../CreepAction';

export class MoveToTarget extends CreepAction {
  constructor(
    getMemory: () => NodeMemory,
    agent: Id<Creep>,
    protected dist: number = 1,
  ) {
    super(getMemory, agent);
  }

  runCreep(creep: Creep, context: CreepContext) {
    const target = WithTarget.resolveTarget(context.target);

    if (creep.pos.getRangeTo(target) <= this.dist) {
      return State.SUCCEEDED;
    }

    const res = creep.moveTo(target, {
      visualizePathStyle: { stroke: '#00ffff' },
      range: this.dist,
    });

    if (res !== OK && res !== ERR_BUSY && res !== ERR_TIRED) {
      return State.FAILED;
    }

    return State.RUNNING;
  }
}
