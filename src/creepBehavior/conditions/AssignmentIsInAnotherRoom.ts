import { CreepCondition } from '../CreepCondition';

export class AssignmentIsInAnotherRoom extends CreepCondition {
  checkCreep(creep: Creep) {
    const assignedPos = creep.memory.assignedPos;

    if (!assignedPos) {
      return false;
    }

    return creep.room.name !== assignedPos.room;
  }
}
