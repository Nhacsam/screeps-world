// import { ErrorMapper } from './utils/ErrorMapper';
import { runSim } from './sim';

// @ts-ignore
console.logUnsafe('<span style="color:#88ffff">Refreshed !</span>');

export const loop = () => {
  if (Game.rooms.sim) {
    const runAll = runSim();
    if (!runAll) {
      return;
    }
  }

  const usage = Game.cpu.getUsed();
  console.log(`${usage.toFixed(4)} (${Game.cpu.bucket})`);
};
