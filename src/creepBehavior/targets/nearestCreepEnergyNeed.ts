export const nearestCreepEnergyNeed =
  () =>
  (id: Id<Creep>): Id<StructureSpawn | StructureExtension> | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) return undefined;

    const target = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
      filter: (c) => {
        if (c.memory.role !== 'worker') {
          return false;
        }

        const workBodyParts = c.body.filter((b) => b.type === 'work').length;

        return c.store.getFreeCapacity(RESOURCE_ENERGY) > workBodyParts * 5;
      },
    });

    return target?.id as Id<StructureSpawn | StructureExtension> | undefined;
  };
