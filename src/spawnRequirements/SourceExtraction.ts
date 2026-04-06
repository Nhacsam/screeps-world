import { harvesterRole, haulerRole } from '../roles';
import { HaulerAssignment } from '../roles/hauler';
import { CityInfo } from '../room/CityInfo';
import { SourceInfos } from '../room/SourceInfo';
import { RequirementBuilder, SpawnRequirement } from '../spawn/SpawnRequirement';
import { fromPos } from '../utils/pos';
import { getBodyPartsCost, scaleBody } from './scaleBody';

const HARVEST_POWER = 2; // energy per WORK part per tick

function computeNeededWorkParts(source: SourceInfos<Source>): number {
  return Math.ceil(source.maxCapacity / (ENERGY_REGEN_TIME * HARVEST_POWER)) + 1;
}

function computeNeededCarryParts(
  source: SourceInfos<Source>,
  builtWorkPartsForSource: number,
  carryToMoveRatio: number = 2, // CARRY parts per MOVE part, e.g. [CARRY, CARRY, MOVE] = 2
): number {
  // Empty hauler: CARRY parts have no fatigue load → 1 tick/tile
  const ticksToSourceEmpty = source.distanceToCenter;
  // Full hauler: carryToMoveRatio CARRY per MOVE → carryToMoveRatio ticks/tile on plain
  const ticksToSourceFull = source.distanceToCenter * carryToMoveRatio;
  const roundTripTicks = ticksToSourceEmpty + ticksToSourceFull;

  const harvestedPerRegen = Math.min(builtWorkPartsForSource * HARVEST_POWER * ENERGY_REGEN_TIME, source.maxCapacity);
  const energyPerTick = harvestedPerRegen / ENERGY_REGEN_TIME;

  // Each CARRY part transports CARRY_CAPACITY energy per round trip
  const energyPerCarryPerTick = CARRY_CAPACITY / roundTripTicks;

  return Math.ceil(energyPerTick / energyPerCarryPerTick);
}

const numberOfParts = (parts: BodyPartConstant[], countPart: BodyPartConstant) =>
  parts.filter((p) => p == countPart).length;

export class SourceExtraction implements RequirementBuilder<HaulerAssignment> {
  constructor(private priority: number = 0) {}

  buildRequirement(city: CityInfo): SpawnRequirement[] | null {
    const requirements: SpawnRequirement[] = [];

    const sources = city.getAllSources();
    if (sources.length === 0) {
      return null;
    }

    const priorityStep = 10 / sources.length;

    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
      const source = sources[sourceIndex]!;

      const builtWorkParts = this.buildRequirementsForBodyPartsCount({
        city,
        requirePartsCount: computeNeededWorkParts(source),
        unit: [WORK, WORK, MOVE],
        countedPart: WORK,
        createRequirement: (bodyParts, i) => {
          const pos = source.harvesterPos[i];
          if (!pos) {
            return false;
          }
          let priority = this.priority + 10 - (sourceIndex + 1) * priorityStep;
          if (i === 0) {
            priority += priorityStep / 2;
          }

          requirements.push({
            role: harvesterRole,
            priority,
            assignment: { sourceId: source.id as string, pos: fromPos(pos) },
            assignmentKey: `harvester-${source.id}-${pos.x}-${pos.y}`,
            bodyParts,
            energyRequirement: getBodyPartsCost(bodyParts),
          });
          return true;
        },
      });

      this.buildRequirementsForBodyPartsCount({
        city,
        requirePartsCount: computeNeededCarryParts(source, builtWorkParts, 2),
        unit: [CARRY, CARRY, MOVE],
        countedPart: CARRY,
        createRequirement: (bodyParts, i) => {
          let priority = this.priority + 10 - (sourceIndex + 1) * priorityStep;
          if (i === 0) {
            priority += priorityStep / 2;
          }

          requirements.push({
            role: haulerRole,
            priority: priority - priorityStep / 4,
            assignment: { sourceId: source.id as string, pos: fromPos(source.pos) },
            assignmentKey: `hauler-${i}-${source.id}`,
            bodyParts,
            energyRequirement: getBodyPartsCost(bodyParts),
          });
          return true;
        },
      });
    }
    return requirements;
  }

  buildRequirementsForBodyPartsCount({
    city,
    requirePartsCount,
    unit,
    countedPart,
    createRequirement,
  }: {
    city: CityInfo;
    requirePartsCount: number;
    unit: BodyPartConstant[];
    countedPart: BodyPartConstant;
    createRequirement: (body: BodyPartConstant[], index: number) => boolean;
  }) {
    const energyCapacity = city.getEnergyCapacityAvailable();
    let missingParts = requirePartsCount;

    for (let i = 0; missingParts > 0; i++) {
      const maxUnits = Math.ceil(missingParts / numberOfParts(unit, countedPart));
      const bodyParts = scaleBody(unit, energyCapacity, maxUnits);
      const partsCount = numberOfParts(bodyParts, countedPart);

      if (partsCount === 0) {
        break;
      }

      const success = createRequirement(bodyParts, i);
      if (!success) {
        break;
      }

      missingParts -= partsCount;
    }

    return requirePartsCount - missingParts;
  }
}
