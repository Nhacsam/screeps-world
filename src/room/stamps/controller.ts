import { Stamp } from './Stamp';

export const controller: Stamp = {
  anchor: { x: 2, y: 2 },
  size: { x: 3, y: 3 },
  roadsCanOverlap: false,
  controllerRange: 3,
  allowRotation: false,

  steps: [
    {
      rcl: 2,
      buildings: {
        container: [{ x: 2, y: 2 }],
      },
    },
  ],
};
