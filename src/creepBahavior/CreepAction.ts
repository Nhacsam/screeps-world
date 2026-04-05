import { State, Action } from '../behaviorTree';

export abstract class CreepAction extends Action<Id<Creep>, CreepContext> {
  get creep() {
    return Game.getObjectById(this.getAgent());
  }

  run(context: CreepContext) {
    const creep = this.creep;
    if (!creep) return State.FAILED;

    return this.runCreep(creep, context);
  }

  abstract runCreep(creep: Creep, context: CreepContext): State;
}
