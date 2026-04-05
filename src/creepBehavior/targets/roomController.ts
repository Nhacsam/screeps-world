export const roomController =
  () =>
  (id: Id<Creep>): Id<any> | RoomPosition | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) {
      return undefined;
    }

    const controller = creep.room.controller;
    if (!controller) {
      return undefined;
    }

    return controller.id;
  };
