import { State, WithTarget } from '../../behaviorTree';
import { CreepAction } from '../CreepAction';

export class Pickup extends CreepAction {
  runCreep(creep: Creep, context: CreepContext) {
    if (creep.store.getFreeCapacity() === 0) {
      return State.SUCCEEDED;
    }

    const target = WithTarget.resolveTarget(context.target);

    if (!target) {
      return State.SUCCEEDED;
    }

    if (!(target instanceof Resource)) {
      console.error('Pickup: invalid target ' + target.constructor?.name);
      return State.FAILED;
    }

    if (target.amount === 0) {
      return State.SUCCEEDED;
    }

    if (creep.pos.getRangeTo(target) > 1) {
      return State.FAILED;
    }

    const res = creep.pickup(target);

    if (res === ERR_FULL) {
      return State.SUCCEEDED;
    }

    if (res !== OK && res !== ERR_BUSY) {
      return State.FAILED;
    }

    return State.RUNNING;
  }
}
