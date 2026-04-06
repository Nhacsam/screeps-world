import { Stamp } from './Stamp';

const hallway: Stamp = {
  anchor: { x: 1, y: 3 },
  size: { x: 3, y: 3 },
  roadsCanOverlap: true,

  steps: [
    {
      rcl: 3,
      buildings: {
        extension: [
          { x: 3, y: 2 },
          { x: 3, y: 3 },
          { x: 2, y: 3 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
        ],
        road: [
          { x: 3, y: 1 },
          { x: 2, y: 2 },
          { x: 1, y: 3 },
        ],
      },
    },
  ],
};

export const extensions: Stamp = {
  anchor: { x: 1, y: 3 },
  size: { x: 5, y: 5 },
  roadsCanOverlap: true,

  steps: [
    {
      rcl: 3,
      buildings: {
        extension: [
          { x: 3, y: 2 },
          { x: 3, y: 3 },
          { x: 3, y: 4 },
          { x: 2, y: 3 },
          { x: 4, y: 3 },
        ],
        road: [
          { x: 3, y: 1 },
          { x: 2, y: 2 },
          { x: 1, y: 3 },
          { x: 2, y: 4 },
          { x: 3, y: 5 },
          { x: 4, y: 4 },
          { x: 5, y: 3 },
          { x: 4, y: 2 },
        ],
      },
    },
  ],
  alternatives: [hallway],
};
