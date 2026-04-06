import { toPos } from '../../utils/pos';

export const droppedAroundAssignment =
  (range: number = 3) =>
  (id: Id<Creep>): Id<any> | RoomPosition | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) {
      return undefined;
    }

    if (!creep.memory.assignedPos) {
      return undefined;
    }

    const assignement = toPos(creep.memory.assignedPos);

    const resources = assignement.findInRange(FIND_DROPPED_RESOURCES, range);

    let largest: Resource | null = null;
    for (const resource of resources) {
      if (!largest) {
        largest = resource;
        continue;
      }
      if (largest.amount < resource.amount) {
        largest = resource;
      }
    }

    if (!largest) {
      return undefined;
    }
    return largest.id;
  };
