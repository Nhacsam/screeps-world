export const nearestSpawnEnergyNeed =
  () =>
  (id: Id<Creep>): Id<StructureSpawn | StructureExtension> | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) return undefined;

    const target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (s) =>
        (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
    });

    return target?.id as Id<StructureSpawn | StructureExtension> | undefined;
  };
