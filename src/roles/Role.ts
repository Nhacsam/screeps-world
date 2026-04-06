import { TreeBuilder } from '../behaviorTree';

export interface Role<TAssignment = string> {
  readonly name: string;
  buildBody(energyAvailable: number): BodyPartConstant[];
  buildTree: TreeBuilder<Id<Creep>, CreepContext>;
  /** Extra fields to merge into the creep's initial memory (beyond role/city/assignment). */
  buildMemory(assignment: TAssignment, city: string): Partial<CreepMemory>;
}

/**
 * Proportional body scaling: repeat `unit` as many times as energy allows, up to `maxUnits`.
 * Always returns at least one unit regardless of energy (minimum viable body).
 */
export function scaleBody(unit: BodyPartConstant[], energyAvailable: number, maxUnits: number): BodyPartConstant[] {
  const unitCost = unit.reduce((sum, part) => sum + BODYPART_COST[part], 0);
  const count = Math.max(1, Math.min(Math.floor(energyAvailable / unitCost), maxUnits));
  return ([] as BodyPartConstant[]).concat(...Array(count).fill(unit));
}
