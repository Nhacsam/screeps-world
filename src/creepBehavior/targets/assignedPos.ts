import { toPos } from '../../utils/pos';

export const assignedPos =
  () =>
  (id: Id<Creep>): RoomPosition | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) {
      return undefined;
    }

    return creep.memory.assignedPos ? toPos(creep.memory.assignedPos) : undefined;
  };
