import { TaskList } from '../taskList/TaskList';
import { TaskListMemory } from '../taskList/Task';
import { CityInfo } from './CityInfo';
import { SourceInfos } from './SourceInfo';
import { Stamp, StampStep } from './stamps/Stamp';
import { distanceTransform } from './algos/distanceTransform';
import { floodFill } from './algos/floodFill';
import { BuildTask } from './BuildTask';

const EXIT_BUFFER = 3;
const ROOM_MAX = 49 - EXIT_BUFFER; // 46

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

interface PlannedBuilding {
  type: BuildableStructureConstant;
  pos: RoomCoord;
  minRcl: number;
}

interface RoomPlanMemory {
  plan: PlannedBuilding[];
  buildTasks: TaskListMemory<BuildTask>;
  lastRcl: number;
}

declare global {
  interface Memory {
    roomPlans: Record<string, RoomPlanMemory>;
  }
}

export function initRoomPlanMemory(roomName: string): void {
  if (!Memory.roomPlans) Memory.roomPlans = {};
  if (!Memory.roomPlans[roomName]) {
    Memory.roomPlans[roomName] = { plan: [], buildTasks: { tasks: {}, nextId: 0 }, lastRcl: 0 };
  }
}

// ---------------------------------------------------------------------------
// Rotation helpers
// ---------------------------------------------------------------------------

type Rotation = 0 | 1 | 2 | 3; // 0°, 90°, 180°, 270°
const ROTATIONS: Rotation[] = [0, 1, 2, 3];

function rotateCoord(coord: Coord, rotation: Rotation): Coord {
  const { x, y } = coord;
  switch (rotation) {
    case 0:
      return { x, y };
    case 1:
      return { x: y, y: -x };
    case 2:
      return { x: -x, y: -y };
    case 3:
      return { x: -y, y: x };
  }
}

function translateCoord(stampCoord: Coord, stampAnchor: Coord, anchorRoomPos: Coord, rotation: Rotation): Coord {
  const rel = rotateCoord({ x: stampCoord.x - stampAnchor.x, y: stampCoord.y - stampAnchor.y }, rotation);
  return { x: anchorRoomPos.x + rel.x, y: anchorRoomPos.y + rel.y };
}

// ---------------------------------------------------------------------------
// Placement helpers
// ---------------------------------------------------------------------------

function chebyshev(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function isInRoom(coord: Coord): boolean {
  return coord.x >= EXIT_BUFFER && coord.x <= ROOM_MAX && coord.y >= EXIT_BUFFER && coord.y <= ROOM_MAX;
}

function getLastStep(stamp: Stamp): StampStep | undefined {
  return stamp.steps[stamp.steps.length - 1];
}

type BuildingEntry = { type: BuildableStructureConstant; coord: Coord };

function getBuildingEntries(step: StampStep): BuildingEntry[] {
  const result: BuildingEntry[] = [];
  for (const [type, coords] of Object.entries(step.buildings) as [BuildableStructureConstant, Coord[] | undefined][]) {
    if (!coords) continue;
    for (const coord of coords) {
      result.push({ type, coord });
    }
  }
  return result;
}

interface OccupiedTiles {
  /** All building tiles (roads and non-roads). */
  all: Set<string>;
  /** Non-road building tiles only. */
  nonRoads: Set<string>;
}

function buildOccupiedTiles(stamp: Stamp, anchorRoomPos: Coord, rotation: Rotation): OccupiedTiles {
  const all = new Set<string>();
  const nonRoads = new Set<string>();
  const lastStep = getLastStep(stamp);
  if (!lastStep) return { all, nonRoads };
  for (const { type, coord } of getBuildingEntries(lastStep)) {
    const rc = translateCoord(coord, stamp.anchor, anchorRoomPos, rotation);
    const key = `${rc.x},${rc.y}`;
    all.add(key);
    if (type !== STRUCTURE_ROAD) nonRoads.add(key);
  }
  return { all, nonRoads };
}

/**
 * Returns true if the stamp can be placed at anchorRoomPos with the given rotation:
 * - All tiles are in-room and not walls
 * - No building overlaps with a forbidden tile
 *   - Road-on-road is allowed if both stamps have roadsCanOverlap: true (canOverlapRoads = true)
 *   - Non-roads can never overlap with anything
 */
function isValidPlacement(
  stamp: Stamp,
  anchorRoomPos: Coord,
  rotation: Rotation,
  terrain: RoomTerrain,
  occupied: OccupiedTiles,
  canOverlapRoads: boolean,
): boolean {
  const lastStep = getLastStep(stamp);
  if (!lastStep) return true;
  for (const { type, coord } of getBuildingEntries(lastStep)) {
    const rc = translateCoord(coord, stamp.anchor, anchorRoomPos, rotation);
    if (!isInRoom(rc)) return false;
    if (terrain.get(rc.x, rc.y) === TERRAIN_MASK_WALL) return false;
    const key = `${rc.x},${rc.y}`;
    if (type === STRUCTURE_ROAD && canOverlapRoads) {
      // Road may share a tile with another road but not with a non-road
      if (occupied.nonRoads.has(key)) return false;
    } else {
      if (occupied.all.has(key)) return false;
    }
  }
  return true;
}

const EMPTY_OCCUPIED: OccupiedTiles = { all: new Set(), nonRoads: new Set() };

/**
 * Returns all tiles in the stamp's bounding box (size × size centered on anchor),
 * translated to room coordinates with the given rotation.
 * Used to reserve the full footprint of a controller-range stamp.
 */
function buildFootprintTiles(stamp: Stamp, anchorRoomPos: Coord, rotation: Rotation): Set<string> {
  const set = new Set<string>();
  const halfX = Math.floor(stamp.size.x / 2);
  const halfY = Math.floor(stamp.size.y / 2);
  for (let dx = -halfX; dx <= halfX; dx++) {
    for (let dy = -halfY; dy <= halfY; dy++) {
      const rc = rotateCoord({ x: dx, y: dy }, rotation);
      set.add(`${anchorRoomPos.x + rc.x},${anchorRoomPos.y + rc.y}`);
    }
  }
  return set;
}

function mergeOccupied(a: OccupiedTiles, b: OccupiedTiles): OccupiedTiles {
  return {
    all: new Set([...a.all, ...b.all]),
    nonRoads: new Set([...a.nonRoads, ...b.nonRoads]),
  };
}

// ---------------------------------------------------------------------------
// RoomPlanner
// ---------------------------------------------------------------------------

interface PlacedStamp {
  stamp: Stamp;
  anchorRoomPos: Coord;
  rotation: Rotation;
}

export class RoomPlanner {
  private plan: PlannedBuilding[];
  private buildTasks: TaskList<BuildTask>;
  private lastRcl: number;

  constructor(
    private roomName: string,
    private cityInfo: CityInfo,
    private stamps: Stamp[],
  ) {
    const mem = Memory.roomPlans[roomName];
    this.plan = mem.plan;
    this.lastRcl = mem.lastRcl;
    this.buildTasks = new TaskList<BuildTask>(() => Memory.roomPlans[roomName].buildTasks);

    if (this.plan.length === 0) {
      this.computePlan();
    }
  }

  update(): void {
    const room = Game.rooms[this.roomName];
    if (!room?.controller) return;

    this.visualize(room);

    const currentRcl = room.controller.level;
    if (currentRcl === this.lastRcl) return;

    const existingKeys = new Set(this.buildTasks.all().map((t) => buildingKey(t.data.type, t.data.pos)));

    for (const building of this.plan) {
      if (building.minRcl > currentRcl) continue;
      if (existingKeys.has(buildingKey(building.type, building.pos))) continue;
      const structures = room.lookForAt(LOOK_STRUCTURES, building.pos.x, building.pos.y);
      if (structures.some((s) => s.structureType === building.type)) continue;
      this.buildTasks.add({ type: building.type, pos: building.pos }, 8 - building.minRcl);
    }

    this.lastRcl = currentRcl;
    this.apply();
  }

  getBuildTaskList(): TaskList<BuildTask> {
    return this.buildTasks;
  }

  visualize(room: Room): void {
    const visual = room.visual;
    for (const building of this.plan) {
      visual.structure(building.pos.x, building.pos.y, building.type, { opacity: 0.5 });
    }
    visual.connectRoads({ opacity: 0.5 });
  }

  // ---------------------------------------------------------------------------
  // Private — plan computation
  // ---------------------------------------------------------------------------

  private computePlan(): void {
    const room = Game.rooms[this.roomName];
    if (!room) return;

    const terrain = room.getTerrain();
    const terrainCM = new PathFinder.CostMatrix();
    for (let x = 0; x < 50; x++) {
      for (let y = 0; y < 50; y++) {
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) terrainCM.set(x, y, 255);
      }
    }
    const dtCM = distanceTransform(room, terrainCM);

    const placed = this.placeStamps(room, terrain, dtCM);

    this.plan = [];
    for (const p of placed) {
      this.addStampToPlan(p);
    }

    this.apply();
  }

  private placeStamps(room: Room, terrain: RoomTerrain, dtCM: CostMatrix): PlacedStamp[] {
    if (this.stamps.length === 0) return [];

    const controller = room.controller;
    const sources = this.cityInfo.getAllSources();
    const result: PlacedStamp[] = [];

    // Phase 1: Place controller-range stamps first (placed near controller, full footprint reserved).
    let globalForbidden: OccupiedTiles = EMPTY_OCCUPIED;

    for (const stamp of this.stamps) {
      if (stamp.controllerRange === undefined) continue;
      const placed = this.placeControllerStamp(stamp, room, terrain, controller, globalForbidden, dtCM);
      if (!placed) continue;
      result.push(placed);
      // Reserve the entire footprint so other stamps leave that space empty.
      const footprint = buildFootprintTiles(stamp, placed.anchorRoomPos, placed.rotation);
      const footprintOccupied: OccupiedTiles = { all: footprint, nonRoads: footprint };
      globalForbidden = mergeOccupied(globalForbidden, footprintOccupied);
    }

    // Phase 2: Joint placement of remaining stamps (center + flower).
    const freeStamps = this.stamps.filter((s) => s.controllerRange === undefined);
    if (freeStamps.length === 0) return result;

    const centerStamp = freeStamps[0]!;

    // If a spawn already exists in the room, the center stamp must be placed so its spawn aligns with it.
    const existingSpawn = room.find(FIND_MY_SPAWNS)[0];
    const spawnConstrained = existingSpawn
      ? this.findSpawnConstrainedPlacement(centerStamp, terrain, globalForbidden, existingSpawn.pos)
      : null;

    // Find unconstrained optimal center anchor (respecting already-reserved tiles).
    let optimalCenter: { pos: Coord; rotation: Rotation } | null = spawnConstrained
      ? { pos: spawnConstrained.anchorRoomPos, rotation: spawnConstrained.rotation }
      : null;

    if (!optimalCenter) {
      let best: { pos: Coord; rotation: Rotation; score: number } | null = null;
      for (let x = EXIT_BUFFER; x <= ROOM_MAX; x++) {
        for (let y = EXIT_BUFFER; y <= ROOM_MAX; y++) {
          if (dtCM.get(x, y) === 0) continue;
          const pos = { x, y };
          for (const rotation of ROTATIONS) {
            if (!isValidPlacement(centerStamp, pos, rotation, terrain, globalForbidden, false)) continue;
            const score = this.placementScore(pos, controller, sources);
            if (!best || score < best.score) {
              best = { pos, rotation, score };
            }
          }
        }
      }
      optimalCenter = best;
    }

    if (!optimalCenter) return result;

    if (freeStamps.length === 1) {
      result.push({ stamp: centerStamp, anchorRoomPos: optimalCenter.pos, rotation: optimalCenter.rotation });
      return result;
    }

    // Joint search: center within Chebyshev ≤ 2 of optimal, flower within Chebyshev ≤ 4 of center.
    // When center is spawn-constrained, it is fixed (only 1 candidate position/rotation).
    const flowerStamp = freeStamps[1]!;
    const roadsCanOverlap = centerStamp.roadsCanOverlap === true && flowerStamp.roadsCanOverlap === true;

    let best: {
      center: { pos: Coord; rotation: Rotation };
      flower: { pos: Coord; rotation: Rotation };
      centerDist: number;
      flowerDist: number;
    } | null = null;

    // When spawn-constrained, the center has exactly one candidate; otherwise search ±2 tiles.
    const centerCandidates: Array<{ pos: Coord; rotation: Rotation }> = [];
    if (spawnConstrained) {
      centerCandidates.push({ pos: spawnConstrained.anchorRoomPos, rotation: spawnConstrained.rotation });
    } else {
      for (let cx = optimalCenter.pos.x - 2; cx <= optimalCenter.pos.x + 2; cx++) {
        for (let cy = optimalCenter.pos.y - 2; cy <= optimalCenter.pos.y + 2; cy++) {
          if (cx < EXIT_BUFFER || cx > ROOM_MAX || cy < EXIT_BUFFER || cy > ROOM_MAX) continue;
          for (const cRot of ROTATIONS) {
            centerCandidates.push({ pos: { x: cx, y: cy }, rotation: cRot });
          }
        }
      }
    }

    const opt = optimalCenter.pos;

    for (const { pos: cPos, rotation: cRot } of centerCandidates) {
      if (!cPos) {
        continue;
      }
      if (!isValidPlacement(centerStamp, cPos, cRot, terrain, globalForbidden, false)) continue;

      const centerDist = chebyshev(cPos, opt);
      const flowerForbidden = mergeOccupied(globalForbidden, buildOccupiedTiles(centerStamp, cPos, cRot));

      for (let fx = cPos.x - 4; fx <= cPos.x + 4; fx++) {
        for (let fy = cPos.y - 4; fy <= cPos.y + 4; fy++) {
          if (fx < EXIT_BUFFER || fx > ROOM_MAX || fy < EXIT_BUFFER || fy > ROOM_MAX) continue;
          const fPos = { x: fx, y: fy };
          const flowerDist = chebyshev(fPos, cPos);
          if (flowerDist >= 5) continue;

          for (const fRot of ROTATIONS) {
            if (!isValidPlacement(flowerStamp, fPos, fRot, terrain, flowerForbidden, roadsCanOverlap)) continue;

            if (
              !best ||
              centerDist < best.centerDist ||
              (centerDist === best.centerDist && flowerDist < best.flowerDist)
            ) {
              best = {
                center: { pos: cPos, rotation: cRot },
                flower: { pos: fPos, rotation: fRot },
                centerDist,
                flowerDist,
              };
            }
          }
        }
      }
    }

    if (!best) {
      result.push({ stamp: centerStamp, anchorRoomPos: optimalCenter.pos, rotation: optimalCenter.rotation });
      return result;
    }

    result.push(
      { stamp: centerStamp, anchorRoomPos: best.center.pos, rotation: best.center.rotation },
      { stamp: flowerStamp, anchorRoomPos: best.flower.pos, rotation: best.flower.rotation },
    );
    return result;
  }

  /**
   * If the room already has a spawn, derive the center stamp anchor from it:
   * for each spawn coord in the stamp and each rotation, compute where the anchor
   * would need to be so the stamp's spawn lands exactly on the existing spawn.
   * Returns the first valid placement found, or null.
   */
  private findSpawnConstrainedPlacement(
    stamp: Stamp,
    terrain: RoomTerrain,
    forbidden: OccupiedTiles,
    existingSpawnPos: RoomPosition,
  ): PlacedStamp | null {
    const lastStep = getLastStep(stamp);
    if (!lastStep?.buildings.spawn) return null;

    for (const spawnCoord of lastStep.buildings.spawn) {
      const rel = { x: spawnCoord.x - stamp.anchor.x, y: spawnCoord.y - stamp.anchor.y };

      for (const rotation of ROTATIONS) {
        const rotatedRel = rotateCoord(rel, rotation);
        const anchorPos = {
          x: existingSpawnPos.x - rotatedRel.x,
          y: existingSpawnPos.y - rotatedRel.y,
        };
        if (anchorPos.x < 1 || anchorPos.x > 48 || anchorPos.y < 1 || anchorPos.y > 48) continue;
        if (!isValidPlacement(stamp, anchorPos, rotation, terrain, forbidden, false)) continue;
        return { stamp, anchorRoomPos: anchorPos, rotation };
      }
    }
    return null;
  }

  private placeControllerStamp(
    stamp: Stamp,
    room: Room,
    terrain: RoomTerrain,
    controller: StructureController | undefined,
    forbidden: OccupiedTiles,
    dtCM: CostMatrix,
  ): PlacedStamp | null {
    if (!controller) return null;
    const range = stamp.controllerRange!;

    // Flood fill from the controller gives each tile's walking distance from it.
    const fillCM = floodFill(room, [{ x: controller.pos.x, y: controller.pos.y }]);

    // Only try rotation 0 — the stamp is symmetrical (allowRotation: false).
    const rotation: Rotation = 0;

    let best: { pos: Coord; dtValue: number; fillDepth: number } | null = null;

    for (let x = 3; x <= 46; x++) {
      for (let y = 3; y <= 46; y++) {
        const pos = { x, y };
        if (!isValidPlacement(stamp, pos, rotation, terrain, forbidden, false)) continue;

        // All footprint tiles must be within controllerRange of the controller.
        const footprint = buildFootprintTiles(stamp, pos, rotation);
        let allInRange = true;
        for (const key of footprint) {
          const [tx, ty] = key.split(',').map(Number) as [number, number];
          if (chebyshev({ x: tx, y: ty }, controller.pos) > range) {
            allInRange = false;
            break;
          }
        }
        if (!allInRange) continue;

        // Score: maximize distance transform (most open space for upgraders),
        // tiebreak by minimizing flood fill depth (walking distance from controller).
        const dtValue = dtCM.get(x, y);
        const fillDepth = fillCM.get(x, y);

        if (!best || dtValue > best.dtValue || (dtValue === best.dtValue && fillDepth < best.fillDepth)) {
          best = { pos, dtValue, fillDepth };
        }
      }
    }

    if (!best) return null;
    return { stamp, anchorRoomPos: best.pos, rotation };
  }

  private placementScore(
    pos: Coord,
    controller: StructureController | undefined,
    sources: SourceInfos<Source>[],
  ): number {
    const controllerDist = controller ? chebyshev(pos, controller.pos) : 0;
    const sourceDist = sources.length > 0 ? Math.min(...sources.map((s) => chebyshev(pos, s.pos))) : 0;
    return 2 * controllerDist + sourceDist;
  }

  private addStampToPlan(placed: PlacedStamp): void {
    const { stamp, anchorRoomPos, rotation } = placed;
    const seen = new Set(this.plan.map((b) => buildingKey(b.type, b.pos)));

    for (const step of stamp.steps) {
      for (const { type, coord } of getBuildingEntries(step)) {
        const rc = translateCoord(coord, stamp.anchor, anchorRoomPos, rotation);
        const pos: RoomCoord = { x: rc.x, y: rc.y, room: this.roomName };
        const key = buildingKey(type, pos);
        if (seen.has(key)) continue;
        seen.add(key);
        this.plan.push({ type, pos, minRcl: step.rcl });
      }
    }
  }

  private apply(): void {
    Memory.roomPlans[this.roomName].plan = this.plan;
    Memory.roomPlans[this.roomName].lastRcl = this.lastRcl;
    this.buildTasks.apply();
  }
}

function buildingKey(type: BuildableStructureConstant, pos: RoomCoord): string {
  return `${type}-${pos.x}-${pos.y}`;
}
