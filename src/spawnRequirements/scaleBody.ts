export const getBodyPartsCost = (parts: BodyPartConstant[]): number =>
  parts.reduce((sum, part) => sum + BODYPART_COST[part], 0);

/**
 * Proportional body scaling: repeat `unit` as many times as energy allows, up to `maxUnits`.
 * Always returns at least one unit regardless of energy (minimum viable body).
 */
export function scaleBody(unit: BodyPartConstant[], energyAvailable: number, maxUnits: number): BodyPartConstant[] {
  const unitCost = getBodyPartsCost(unit);
  const count = Math.max(1, Math.min(Math.floor(energyAvailable / unitCost), maxUnits));
  return ([] as BodyPartConstant[]).concat(...Array(count).fill(unit));
}
