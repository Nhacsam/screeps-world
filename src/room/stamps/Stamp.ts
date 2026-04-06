export interface Operator {
  coord: Coord;
  role: string;
}

export interface StampStep {
  rcl: number;
  buildings: {
    spawn?: Coord[];
    storage?: Coord[];
    link?: Coord[];
    road?: Coord[];
    terminal?: Coord[];
    nuker?: Coord[];
    powerSpawn?: Coord[];
    factory?: Coord[];
    tower?: Coord[];
    extension?: Coord[];
    container?: Coord[];
  };
  operators?: Operator[];
}

export interface Stamp {
  anchor: Coord;
  size: Coord;

  /* default is true */
  allowRotation?: boolean;
  roadsCanOverlap?: boolean;

  steps: StampStep[];
  slternatives?: Stamp[];
}
