import { Role } from '../roles';
import { RequirementBuilder, SpawnRequirement } from '../spawn/SpawnRequirement';

export class FixedCount implements RequirementBuilder {
  private name: string;

  constructor(
    private role: Role<string>,
    private count: number,
    name?: string,
    private priority: number = 1,
  ) {
    this.name = name || role.name;
  }

  buildRequirement(): SpawnRequirement[] | null {
    return Array.from({ length: this.count }, (_, i) => ({
      role: this.role,
      priority: this.priority,
      assignment: `${this.name}-${i}`,
      assignmentKey: `${this.name}-${i}`,
    }));
  }
}
