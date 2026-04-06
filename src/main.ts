import { runCreep, cleanupDeadCreeps } from './creepAgent';
import { CityInfo } from './room/CityInfo';
import { RoomPlanner } from './room/RoomPlanner';
import { center as centerStamp } from './room/stamps/center';
import { flowerExtension as flowerStamp } from './room/stamps/flowerExtension';
import { controller as controllerStamp } from './room/stamps/controller';
import { ROLES, workerRole } from './roles';
import { SpawnManager } from './spawn/SpawnManager';
import { FixedCount } from './spawnRequirements/FixedCount';
import { SourceExtraction } from './spawnRequirements/SourceExtraction';
import './utils/RoomVisual.js';

// @ts-ignore
console.log('<span style="color:#88ffff">Refreshed !</span>');

let cityInfo: CityInfo | null = null;
let spawnManager: SpawnManager | null = null;
let roomPlanner: RoomPlanner | null = null;

delete Memory.roomPlans;

export const loop = () => {
  // Initialize once on first tick (or after a code reload)
  if (!cityInfo) {
    const spawn = Object.values(Game.spawns)[0];
    if (!spawn) return;
    cityInfo = new CityInfo(spawn.room.name);
  } else {
    cityInfo.update();
  }

  if (!roomPlanner) {
    const roomName = Object.values(Game.spawns)[0]!.room.name;
    roomPlanner = new RoomPlanner(roomName, cityInfo, [controllerStamp, centerStamp, flowerStamp]);
  }
  roomPlanner.update();

  if (!spawnManager) {
    spawnManager = new SpawnManager(
      cityInfo,
      [
        new FixedCount(workerRole, 1, 'main-worker', 100),
        new SourceExtraction(50),
        new FixedCount(workerRole, 10, 'slave-worker', 1),
      ],
      ROLES,
    );
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
