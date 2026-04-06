import { TreeBuilder } from '../behaviorTree';

export interface Role<TAssignment = any> {
  readonly name: string;
  buildBody?(energyAvailable: number): BodyPartConstant[];
  buildTree: TreeBuilder<Id<Creep>, CreepContext>;
  /** Extra fields to merge into the creep's initial memory (beyond role/city/assignment). */
  buildMemory(assignment: TAssignment, city: string): Partial<CreepMemory>;
}
