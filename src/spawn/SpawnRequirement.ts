import { CityInfo } from '../room/CityInfo';
import { Role } from '../roles/Role';

export interface SpawnRequirement<TAssignment = string> {
  role: Role<TAssignment>;
  priority: number;
  getDesiredAssignments(city: CityInfo): TAssignment[];
  assignmentKey(assignment: TAssignment): string;
}

/** Requirement for a fixed number of creeps, using their index as the assignment key. */
export function fixedCount(
  role: Role<string>,
  count: number,
  priority: number = 0,
): SpawnRequirement<string> {
  return {
    role,
    priority,
    getDesiredAssignments: () => Array.from({ length: count }, (_, i) => String(i)),
    assignmentKey: (a) => a,
  };
}
