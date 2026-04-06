import { toPos } from '../../utils/pos';

export const nearestAroundAssignment =
  (constant: FindConstant, range: number = 3) =>
  (id: Id<Creep>): Id<any> | RoomPosition | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) {
      return undefined;
    }

    if (!creep.memory.assignedPos) {
      return undefined;
    }

    const assignement = toPos(creep.memory.assignedPos);

    const dest = creep.pos.findClosestByPath(constant, {
      filter: (elmt) => assignement.inRangeTo(elmt, range),
    });
    if (!dest) {
      return undefined;
    }
    if (!('pos' in dest)) {
      return dest;
    }

    if (!('id' in dest)) {
      return dest.pos;
    }

    return dest?.id || undefined;
  };
