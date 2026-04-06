import { HarvesterAssignment, harvesterRole, haulerRole, Role } from '../roles';
import { HaulerAssignment } from '../roles/hauler';
import { CityInfo } from '../room/CityInfo';
import { RequirementBuilder, SpawnRequirement } from '../spawn/SpawnRequirement';
import { fromPos } from '../utils/pos';

export class SourceExtraction implements RequirementBuilder<HaulerAssignment> {
  constructor(private priority: number = 0) {}

  buildRequirement(city: CityInfo): SpawnRequirement[] | null {
    const requirements: SpawnRequirement[] = [];

    const sources = city.getAllSources();
    let index = 0;
    for (const source of sources) {
      for (const pos of source.harvesterPos) {
        const priority = this.priority + Math.max(10 - index, 0);

        requirements.push({
          role: harvesterRole,
          priority,
          assignment: { sourceId: source.id as string, pos: fromPos(pos) },
          assignmentKey: `harvester-${source.id}-${pos.x}-${pos.y}`,
        });
        requirements.push({
          role: haulerRole,
          priority: priority - 0.5,
          assignment: { sourceId: source.id as string, pos: fromPos(pos) },
          assignmentKey: `hauler-0-${source.id}-${pos.x}-${pos.y}`,
        });
        requirements.push({
          role: haulerRole,
          priority: priority - 0.5,
          assignment: { sourceId: source.id as string, pos: fromPos(pos) },
          assignmentKey: `hauler-1-${source.id}-${pos.x}-${pos.y}`,
        });
        index++;
      }
    }
    return requirements;
  }
}
