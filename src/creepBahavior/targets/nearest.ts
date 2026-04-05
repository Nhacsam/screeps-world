export const nearest =
  (constant: FindConstant) =>
  (id: Id<Creep>): Id<any> | RoomPosition | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) {
      return undefined;
    }

    const dest = creep.pos.findClosestByPath(constant);
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
