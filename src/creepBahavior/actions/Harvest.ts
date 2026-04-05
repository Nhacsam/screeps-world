import { State, WithTarget } from '../../behaviorTree';
import { CreepAction } from '../CreepAction';

export class Harvest extends CreepAction {
  runCreep(creep: Creep, context: CreepContext) {
    if (creep.store.getFreeCapacity() === 0) {
      return State.SUCCEEDED;
    }

    const target = WithTarget.resolveTarget(context.target);

    if (!target) {
      return State.FAILED;
    }

    if (!(target instanceof Source || target instanceof Mineral || target instanceof Deposit)) {
      console.error('Invalid Target ' + target.constructor?.name);
      return State.FAILED;
    }

    if (creep.pos.getRangeTo(target) > 1) {
      return State.FAILED;
    }

    const res = creep.harvest(target);

    if (res === ERR_NOT_ENOUGH_RESOURCES) {
      return State.SUCCEEDED;
    }

    if (res !== OK && res !== ERR_BUSY && res !== ERR_TIRED) {
      return State.FAILED;
    }

    return State.RUNNING;
  }
}
