import { runCreep, cleanupDeadCreeps } from './creepAgent';
import { CityInfo } from './room/CityInfo';

// @ts-ignore
console.logUnsafe('<span style="color:#88ffff">Refreshed !</span>');

const HARVESTER_BODY: BodyPartConstant[] = [WORK, CARRY, MOVE];
const MAX_HARVESTERS = 10;

let cityInfo: CityInfo | null = null;

export const loop = () => {
  if (!cityInfo) {
    const spawn = Object.values(Game.spawns)[0];
    cityInfo = new CityInfo(spawn!.pos.roomName);
  }

  // Spawn creeps when the spawn is not busy
  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName]!;
    if (spawn.spawning) continue;

    const harvesterCount = Object.values(Game.creeps).filter((c) => c.memory.role === 'harvester').length;

    if (harvesterCount < MAX_HARVESTERS) {
      const name = `Harvester${Game.time}`;
      spawn.spawnCreep(HARVESTER_BODY, name, { memory: { role: 'harvester' } as CreepMemory });
    }
  }

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
