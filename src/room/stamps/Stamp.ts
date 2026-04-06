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

  /**
   * If set, this stamp must be placed near the controller:
   * - It is placed before all other stamps.
   * - All tiles of its full size×size footprint must be within this Chebyshev distance of the controller.
   * - Its entire footprint is reserved (no other stamp may place any building inside it).
   */
  controllerRange?: number;

  steps: StampStep[];
  alternatives?: Stamp[];
}
