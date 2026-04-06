interface RoomVisual {
  structure(x: number, y: number, type: StructureConstant, opts?: { opacity?: number }): this;
  connectRoads(opts?: { color?: string; opacity?: number }): this;
}
