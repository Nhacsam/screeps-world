export const assignedSource =
  () =>
  (id: Id<Creep>): Id<Source> | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) {
      return undefined;
    }

    return creep.memory.assignedSource;
  };
