import { Role } from './Role';
import { workerRole } from './worker';
import { harvesterRole } from './harvester';
import { haulerRole } from './hauler';

export const ROLES: Map<string, Role<any>> = new Map([
  [workerRole.name, workerRole],
  [harvesterRole.name, harvesterRole],
  [haulerRole.name, haulerRole],
]);

export { workerRole } from './worker';
export { harvesterRole, harvesterRequirement } from './harvester';
export type { HarvesterAssignment } from './harvester';
export { haulerRole, haulerRequirement } from './hauler';
export { type Role, scaleBody } from './Role';
