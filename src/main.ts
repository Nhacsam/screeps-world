import { runCreep, cleanupDeadCreeps } from './creepAgent';
import { CityInfo } from './room/CityInfo';
import { ROLES, workerRole, harvesterRequirement, haulerRequirement } from './roles';
import { SpawnManager } from './spawn/SpawnManager';
import { fixedCount } from './spawn/SpawnRequirement';

// @ts-ignore
console.logUnsafe('<span style="color:#88ffff">Refreshed !</span>');

let cityInfo: CityInfo | null = null;
let spawnManager: SpawnManager | null = null;

export const loop = () => {
  // Initialize once on first tick (or after a code reload)
  if (!cityInfo) {
    const spawn = Object.values(Game.spawns)[0];
    if (!spawn) return;
    cityInfo = new CityInfo(spawn.room.name);
  } else {
    cityInfo.update();
  }

  if (!spawnManager) {
    spawnManager = new SpawnManager(cityInfo, [fixedCount(workerRole, 2, 1), harvesterRequirement(2), haulerRequirement(2)], ROLES);
  }

  spawnManager.update();

  // Run behavior tree for each creep
  for (const name in Game.creeps) {
    runCreep(Game.creeps[name]!);
  }

  // Cleanup trees for dead creeps once in a while
  if (Game.time % 100 === 0) {
    cleanupDeadCreeps();
  }

  const usage = Game.cpu.getUsed();
  console.log(`${usage.toFixed(4)} (${Game.cpu.bucket})`);
};
