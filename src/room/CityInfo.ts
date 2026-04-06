import { SerializedPos, toPos, fromPos, isWalkable } from '../utils/pos';
import { SerializedSourceInfo, SourceInfos, deserializeSource, serializeSource } from './SourceInfo';

declare global {
  interface Memory {
    cityInfos: Record<string, CityInfoMemory>;
  }

  interface CityInfoMemory {
    rooms: string[];
    unexploredRooms: string[];
    claimedRooms: string[];
    /** Distance from mainRoom for each known room (BFS depth). */
    roomDistances: Record<string, number>;
    sources: SerializedSourceInfo[];
    mineral?: SerializedSourceInfo;
    center?: SerializedPos;
    upgradeControllerPreferredPositions: SerializedPos[];
    lastRoomsUpdate: Record<string, number>;
  }
}

const cityInfos: Map<string, CityInfo> = new Map();

/**
 * All rooms at room path distance below this value are included in the City.
 */
const MAX_ROOM_DISTANCE = 1;
const UPDATE_PERIOD = 500;

export class CityInfo {
  /** Room names included in the city. Only mainRoom is controlled. */
  private rooms: string[] = [];
  /** Adjacent rooms not yet explored (no vision). */
  private unexploredRooms: string[] = [];
  /** Rooms owned by other players or reserved — excluded from the city. */
  private claimedRooms: string[] = [];
  /** BFS distance from mainRoom for every known room. */
  private roomDistances: Record<string, number> = {};

  private sources: SourceInfos<Source>[] = [];
  private mineral?: SourceInfos<Mineral>;
  /** First spawn position in mainRoom. */
  private center?: RoomPosition;
  private upgradeControllerPreferredPositions: RoomPosition[] = [];
  private lastRoomsUpdate: Record<string, number> = {};

  constructor(private mainRoom: string) {
    this.loadMemory();
    this.update();
    cityInfos.set(mainRoom, this);
  }

  static fromRoomName(mainRoom: string): CityInfo {
    if (cityInfos.has(mainRoom)) {
      return cityInfos.get(mainRoom)!;
    }
    return new CityInfo(mainRoom);
  }

  getMainRoomName(): string {
    return this.mainRoom;
  }
  getAllRooms(): string[] {
    return this.rooms;
  }
  getAllSources(): SourceInfos<Source>[] {
    return this.sources;
  }
  getRoomMineral(): SourceInfos<Mineral> | undefined {
    return this.mineral;
  }
  getRoomCenter(): RoomPosition | undefined {
    return this.center;
  }
  getUpgradeControllerPreferredPositions(): RoomPosition[] {
    return this.upgradeControllerPreferredPositions;
  }
  getUnexploredRooms(): string[] {
    return this.unexploredRooms;
  }

  getNearstUnexploredRoom() {
    if (!this.unexploredRooms.length) {
      return undefined;
    }
    return this.unexploredRooms
      .slice()
      .sort((a, b) => (this.roomDistances[a] ?? Infinity) - (this.roomDistances[b] ?? Infinity))[0]!;
  }

  getController(): StructureController {
    const controller = Game.rooms[this.mainRoom]?.controller;
    if (!controller) {
      throw new Error('Lost track of main controller');
    }
    return controller;
  }

  update(): void {
    this.updateCenter();
    this.updateRooms();

    for (const roomName of this.rooms) {
      if (!this.shouldUpdate(roomName)) continue;
      const room = Game.rooms[roomName];
      if (!room) continue;

      this.updateRoomSources(room);
      if (roomName === this.mainRoom) {
        this.updateRoomMineral(room);
        this.updateUpgradeControllerPositions(room);
      }
      this.lastRoomsUpdate[roomName] = Game.time;
    }

    this.apply();
  }

  // ---------------------------------------------------------------------------
  // Private — update steps
  // ---------------------------------------------------------------------------

  private updateCenter(): void {
    if (this.center) {
      return;
    }
    const room = Game.rooms[this.mainRoom];
    if (!room) return;
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (spawn) this.center = spawn.pos;
  }

  private updateRooms(): void {
    // Seed the BFS from mainRoom on first run
    if (!this.roomDistances[this.mainRoom]) {
      this.roomDistances[this.mainRoom] = 0;
      this.rooms.push(this.mainRoom);
      this.enqueueExits(this.mainRoom, 0);
    }

    // Try to classify rooms we have vision on
    for (const roomName of [...this.unexploredRooms]) {
      const room = Game.rooms[roomName];
      if (!room) continue;

      this.unexploredRooms = this.unexploredRooms.filter((r) => r !== roomName);

      const ctrl = room.controller;
      if (ctrl?.owner && !ctrl.my) {
        this.claimedRooms.push(roomName);
        continue;
      }

      const dist = this.roomDistances[roomName] ?? MAX_ROOM_DISTANCE;
      this.rooms.push(roomName);
      this.enqueueExits(roomName, dist);
    }
  }

  /** Add unseen exits of a room to the unexplored queue, respecting MAX_ROOM_DISTANCE. */
  private enqueueExits(roomName: string, currentDistance: number): void {
    if (currentDistance >= MAX_ROOM_DISTANCE) return;

    const exits = Game.map.describeExits(roomName);
    if (!exits) {
      return;
    }
    for (const exitRoom of Object.values(exits)) {
      if (!exitRoom) continue;
      if (this.rooms.includes(exitRoom)) continue;
      if (this.claimedRooms.includes(exitRoom)) continue;
      if (this.unexploredRooms.includes(exitRoom)) continue;

      this.roomDistances[exitRoom] = currentDistance + 1;
      this.unexploredRooms.push(exitRoom);
    }
  }

  private updateRoomSources(room: Room): void {
    const terrain = room.getTerrain();

    // Remove stale entries for this room, then re-add fresh ones
    this.sources = this.sources.filter((s) => s.pos.roomName !== room.name);

    for (const source of room.find(FIND_SOURCES)) {
      const harvesterPos = this.adjacentWalkable(source.pos, terrain);
      this.sources.push({
        id: source.id,
        pos: source.pos,
        maxNumberOfHarvesters: harvesterPos.length,
        harvesterPos,
        distanceToCenter: this.distanceToCenter(source.pos),
      });
    }
  }

  private updateRoomMineral(room: Room): void {
    const mineral = room.find(FIND_MINERALS)[0];
    if (!mineral) return;

    const terrain = room.getTerrain();
    const harvesterPos = this.adjacentWalkable(mineral.pos, terrain);
    this.mineral = {
      id: mineral.id,
      pos: mineral.pos,
      maxNumberOfHarvesters: harvesterPos.length,
      harvesterPos,
      distanceToCenter: this.distanceToCenter(mineral.pos),
    };
  }

  private updateUpgradeControllerPositions(room: Room): void {
    const controller = room.controller;
    if (!controller) return;

    // Collect all harvester positions as a lookup set for fast exclusion
    const harvesterPosSet = new Set<string>();
    for (const source of this.sources) {
      for (const pos of source.harvesterPos) harvesterPosSet.add(`${pos.x},${pos.y}`);
    }
    if (this.mineral) {
      for (const pos of this.mineral.harvesterPos) harvesterPosSet.add(`${pos.x},${pos.y}`);
    }

    this.upgradeControllerPreferredPositions = [];

    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        if (Math.abs(dx) + Math.abs(dy) === 0) continue;
        const x = controller.pos.x + dx;
        const y = controller.pos.y + dy;
        if (x < 1 || x > 48 || y < 1 || y > 48) continue;
        if (controller.pos.getRangeTo(x, y) > 3) continue;
        if (harvesterPosSet.has(`${x},${y}`)) continue;

        const pos = new RoomPosition(x, y, room.name);
        if (!isWalkable(pos)) continue;
        if (room.lookForAt(LOOK_STRUCTURES, x, y).some((s) => s.structureType === STRUCTURE_ROAD)) continue;

        this.upgradeControllerPreferredPositions.push(new RoomPosition(x, y, room.name));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private — helpers
  // ---------------------------------------------------------------------------

  private shouldUpdate(roomName: string): boolean {
    const last = this.lastRoomsUpdate[roomName];
    return last === undefined || Game.time - last >= UPDATE_PERIOD;
  }

  private adjacentWalkable(pos: RoomPosition, terrain: RoomTerrain): RoomPosition[] {
    const result: RoomPosition[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (x < 1 || x > 48 || y < 1 || y > 48) continue;
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
          result.push(new RoomPosition(x, y, pos.roomName));
        }
      }
    }
    return result;
  }

  private distanceToCenter(pos: RoomPosition): number {
    if (!this.center) return 0;
    const path = PathFinder.search(pos, { pos: this.center, range: 1 });
    return path.incomplete ? Infinity : path.path.length;
  }

  // ---------------------------------------------------------------------------
  // Private — persistence
  // ---------------------------------------------------------------------------

  private loadMemory(): void {
    const mem = Memory.cityInfos?.[this.mainRoom];
    if (!mem) return;

    this.rooms = mem.rooms ?? [];
    this.unexploredRooms = mem.unexploredRooms ?? [];
    this.claimedRooms = mem.claimedRooms ?? [];
    this.roomDistances = mem.roomDistances ?? {};
    this.sources = (mem.sources ?? []).map((s) => deserializeSource<Source>(s));
    this.mineral = mem.mineral ? deserializeSource<Mineral>(mem.mineral) : undefined;
    this.center = mem.center ? toPos(mem.center) : undefined;
    this.upgradeControllerPreferredPositions = (mem.upgradeControllerPreferredPositions ?? []).map(toPos);
    this.lastRoomsUpdate = mem.lastRoomsUpdate ?? {};
  }

  private apply(): void {
    if (!Memory.cityInfos) Memory.cityInfos = {};
    Memory.cityInfos[this.mainRoom] = {
      rooms: this.rooms,
      unexploredRooms: this.unexploredRooms,
      claimedRooms: this.claimedRooms,
      roomDistances: this.roomDistances,
      sources: this.sources.map(serializeSource),
      mineral: this.mineral ? serializeSource(this.mineral) : undefined,
      center: this.center ? fromPos(this.center) : undefined,
      upgradeControllerPreferredPositions: this.upgradeControllerPreferredPositions.map(fromPos),
      lastRoomsUpdate: this.lastRoomsUpdate,
    };
  }
}
