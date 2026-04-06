import { CityInfo } from '../room/CityInfo';
import { Role } from '../roles/Role';

export interface SpawnRequirement<TAssignment = any> {
  role: Role<TAssignment>;
  priority: number;
  assignment: TAssignment;
  assignmentKey: string;
  bodyParts: BodyPartConstant[];
  energyRequirement: number;
}

export interface RequirementBuilder<TAssignement> {
  buildRequirement(city: CityInfo): SpawnRequirement<TAssignement>[] | null;
}
