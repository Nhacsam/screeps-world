import { State, WithTarget } from '../../behaviorTree';
import { CreepAction } from '../CreepAction';

export class ReserveController extends CreepAction {
  runCreep(creep: Creep, context: CreepContext) {
    const target = WithTarget.resolveTarget(context.target);

    if (!target) {
      return State.FAILED;
    }

    if (!(target instanceof StructureController)) {
      console.error('ReserveController: invalid target ' + target.constructor?.name);
      return State.FAILED;
    }

    if (creep.pos.getRangeTo(target) > 1) {
      return State.FAILED;
    }

    const res = creep.reserveController(target);

    if (res !== OK && res !== ERR_BUSY && res !== ERR_TIRED) {
      return State.FAILED;
    }

    return State.RUNNING;
  }
}
