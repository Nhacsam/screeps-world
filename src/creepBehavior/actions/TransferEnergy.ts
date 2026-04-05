import { State, WithTarget } from '../../behaviorTree';
import { CreepAction } from '../CreepAction';

export class TransferEnergy extends CreepAction {
  runCreep(creep: Creep, context: CreepContext) {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      return State.SUCCEEDED;
    }

    const target = WithTarget.resolveTarget(context.target);

    if (!target) {
      return State.FAILED;
    }

    if (!('store' in target)) {
      console.error('Invalid Target ' + target.constructor?.name);
      return State.FAILED;
    }

    const store = target.store as StoreDefinition;

    if (!store.getFreeCapacity(RESOURCE_ENERGY)) {
      return State.SUCCEEDED;
    }

    if (creep.pos.getRangeTo(target) > 1) {
      return State.FAILED;
    }

    const res = creep.transfer(target, RESOURCE_ENERGY);

    if (res === ERR_NOT_ENOUGH_RESOURCES || res === ERR_FULL) {
      return State.SUCCEEDED;
    }

    if (res !== OK && res !== ERR_BUSY && res !== ERR_TIRED) {
      return State.FAILED;
    }

    return State.RUNNING;
  }
}
