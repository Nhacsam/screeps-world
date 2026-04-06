import { CreepCondition } from '../CreepCondition';

export class IsEmpty extends CreepCondition {
  checkCreep(creep: Creep) {
    return creep.store.getUsedCapacity() === 0;
  }
}
