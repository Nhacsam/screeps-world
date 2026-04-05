import { State, WithTarget } from '../../behaviorTree';
import { CreepAction } from '../CreepAction';

export class UpgradeController extends CreepAction {
  runCreep(creep: Creep, context: CreepContext) {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      return State.SUCCEEDED;
    }

    const target = WithTarget.resolveTarget(context.target);

    if (!target) {
      return State.FAILED;
    }

    if (!(target instanceof StructureController)) {
      console.error('Invalid Target ' + target.constructor?.name);
      return State.FAILED;
    }

    if (creep.pos.getRangeTo(target) > 3) {
      return State.FAILED;
    }

    const res = creep.upgradeController(target);

    if (res === ERR_NOT_ENOUGH_RESOURCES) {
      return State.SUCCEEDED;
    }

    if (res !== OK && res !== ERR_BUSY && res !== ERR_TIRED) {
      return State.FAILED;
    }

    return State.RUNNING;
  }
}
