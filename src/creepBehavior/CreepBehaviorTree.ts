import { TreeBuilder, BehaviorTree, WithTargetContext } from '../behaviorTree';

declare global {
  interface CreepContext extends WithTargetContext {}
}

export class CreepBehaviorTree extends BehaviorTree<Id<Creep>, CreepContext> {
  constructor(creep: Creep, builder: TreeBuilder<Id<Creep>>) {
    if (!creep.memory.bt) {
      creep.memory.bt = {};
    }
    super(() => Memory.creeps[creep.name]!.bt, creep.id, builder);
  }

  step() {
    super.step({});
  }
}
