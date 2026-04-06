import { CreepCondition } from '../CreepCondition';

export class NotInCityMainRoom extends CreepCondition {
  checkCreep(creep: Creep) {
    const cityRoom = creep.memory.city;

    if (!cityRoom) {
      return false;
    }

    return creep.room.name !== cityRoom;
  }
}
