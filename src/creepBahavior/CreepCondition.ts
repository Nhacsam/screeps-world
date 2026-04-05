import { Condition } from '../behaviorTree';

export abstract class CreepCondition extends Condition<Id<Creep>, CreepContext> {
  get creep() {
    return Game.getObjectById(this.getAgent());
  }

  check() {
    const creep = this.creep;
    if (!creep) return false;

    return this.checkCreep(creep);
  }

  abstract checkCreep(creep: Creep): boolean;
}
