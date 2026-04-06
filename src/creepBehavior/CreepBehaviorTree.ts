import { TreeBuilder, BehaviorTree, WithTargetContext } from '../behaviorTree';

declare global {
  interface CreepContext extends WithTargetContext {}
}

let debuggedName: string | undefined;

export class CreepBehaviorTree extends BehaviorTree<Id<Creep>, CreepContext> {
  constructor(creep: Creep, builder: TreeBuilder<Id<Creep>>) {
    if (!creep.memory.bt) {
      creep.memory.bt = {};
    }
    super(() => Memory.creeps[creep.name]!.bt, creep.id, builder);
  }

  step() {
    super.step({});

    const creep = Game.getObjectById(this.rootNode.getAgent());

    if (creep?.memory.role !== 'hauler') {
      return;
    }
    if (!debuggedName) {
      debuggedName = creep.name;
    }
    if (debuggedName === creep.name) {
      // creep.say('Hey');
      // console.log(JSON.stringify(creep.memory.bt, undefined, 4));
    }
  }
}
