import { Role } from '../roles';
import { CityInfo } from '../room/CityInfo';
import { RequirementBuilder, SpawnRequirement } from '../spawn/SpawnRequirement';
import { getBodyPartsCost } from './scaleBody';

export class FixedCount implements RequirementBuilder<string> {
  private name: string;

  constructor(
    private role: Role<string>,
    private count: number,
    name?: string,
    private priority: number = 1,
  ) {
    this.name = name || role.name;
  }

  buildRequirement(city: CityInfo): SpawnRequirement[] | null {
    if (!this.role.buildBody) {
      return null;
    }

    const bodyParts = this.role.buildBody(city.getEnergyCapacityAvailable());
    const energyRequirement = getBodyPartsCost(bodyParts);
    return Array.from({ length: this.count }, (_, i) => ({
      role: this.role,
      priority: this.priority,
      assignment: `${this.name}-${i}`,
      assignmentKey: `${this.name}-${i}`,
      bodyParts,
      energyRequirement,
    }));
  }
}
