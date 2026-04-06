declare global {
  interface Coord {
    x: number;
    y: number;
  }

  interface RoomCoord extends Coord {
    room: string;
  }
}

export const ROOM_DIMENSIONS = 50;

export function packXYAsNum(x: number, y: number) {
  return x * ROOM_DIMENSIONS + y;
}
export function unpackNumAsCoord(packedCoord: number) {
  return {
    x: Math.floor(packedCoord / ROOM_DIMENSIONS),
    y: Math.floor(packedCoord % ROOM_DIMENSIONS),
  };
}

export interface RoomCoord {}

export function toPos(s: RoomCoord): RoomPosition {
  return new RoomPosition(s.x, s.y, s.room);
}

export function fromPos(p: RoomPosition): RoomCoord {
  return { x: p.x, y: p.y, room: p.roomName };
}

const BLOCKING_STRUCTURES = new Set<StructureConstant>([
  STRUCTURE_WALL,
  STRUCTURE_SPAWN,
  STRUCTURE_EXTENSION,
  STRUCTURE_TOWER,
  STRUCTURE_STORAGE,
  STRUCTURE_TERMINAL,
  STRUCTURE_LAB,
  STRUCTURE_OBSERVER,
  STRUCTURE_POWER_SPAWN,
  STRUCTURE_NUKER,
  STRUCTURE_FACTORY,
  STRUCTURE_KEEPER_LAIR,
  STRUCTURE_PORTAL,
  STRUCTURE_LINK,
]);

/**
 * Returns true if a creep can stand on the given position:
 * terrain is not a wall, and no blocking structure is present.
 */
export function isWalkable(pos: RoomPosition): boolean {
  const room = Game.rooms[pos.roomName];
  if (!room) return false;

  if (room.getTerrain().get(pos.x, pos.y) === TERRAIN_MASK_WALL) return false;

  return !room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y).some((s) => BLOCKING_STRUCTURES.has(s.structureType));
}
