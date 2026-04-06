import { State, WithTarget } from '../../behaviorTree';
import { CreepAction } from '../CreepAction';

export class MoveToTargetRoom extends CreepAction {
  runCreep(creep: Creep, context: CreepContext) {
    const target = WithTarget.resolveTarget(context.target);

    if (!target) {
      return State.FAILED;
    }

    const targetRoomName = target instanceof RoomPosition ? target.roomName : target.pos.roomName;

    if (creep.room.name === targetRoomName) {
      return State.SUCCEEDED;
    }

    const res = creep.moveTo(new RoomPosition(25, 25, targetRoomName), {
      visualizePathStyle: { stroke: '#ffaa00' },
      range: 20,
      reusePath: 10,
    });

    if (res !== OK && res !== ERR_BUSY && res !== ERR_TIRED) {
      return State.FAILED;
    }

    return State.RUNNING;
  }
}
