import { CreepCondition } from '../CreepCondition';

export class IsFull extends CreepCondition {
  checkCreep(creep: Creep) {
    return creep.store.getFreeCapacity() === 0;
  }
}
