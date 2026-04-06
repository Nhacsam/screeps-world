import { CityInfo } from './CityInfo';
import { SourceInfos } from './SourceInfo';
import { Stamp } from './stamps/Stamp';
import { Rotation, rotateCoord, getLastStep, getBuildingEntries } from './stamps/utils';
import { distanceTransform } from './algos/distanceTransform';

export type { Rotation };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXIT_BUFFER = 3;
const ROOM_MAX = 49 - EXIT_BUFFER; // 46

/** Max Chebyshev deviation of the center stamp from its unconstrained optimum. */
const CENTER_DEVIATION_RADIUS = 2;

/** Max Chebyshev distance from center anchor to flower anchor. */
const FLOWER_MAX_DIST = 4;

/** Weight of controller distance vs. source distance in the center anchor score. */
const CONTROLLER_DISTANCE_WEIGHT = 2;

const ROTATIONS: Rotation[] = [0, 1, 2, 3];

// ---------------------------------------------------------------------------
// Tile key (numeric to avoid string allocations in hot loops)
// ---------------------------------------------------------------------------

function tileKey(x: number, y: number): number {
  return y * 50 + x;
}

// ---------------------------------------------------------------------------
// Building offsets (pre-computed per rotation)
// ---------------------------------------------------------------------------

/** A building's position as an offset from the stamp anchor, already rotated. */
type BuildingOffset = { type: BuildableStructureConstant; dx: number; dy: number };

/** Pre-computed building offsets for each of the 4 rotations, indexed by Rotation. */
type RotatedOffsets = [BuildingOffset[], BuildingOffset[], BuildingOffset[], BuildingOffset[]];

function computeRotatedOffsets(stamp: Stamp): RotatedOffsets {
  const lastStep = getLastStep(stamp);
  if (!lastStep) return [[], [], [], []];
  const entries = getBuildingEntries(lastStep);
  return ROTATIONS.map((rotation) =>
    entries.map(({ type, coord }) => {
      const rel = rotateCoord({ x: coord.x - stamp.anchor.x, y: coord.y - stamp.anchor.y }, rotation);
      return { type, dx: rel.x, dy: rel.y };
    }),
  ) as RotatedOffsets;
}

// ---------------------------------------------------------------------------
// OccupiedTiles
// ---------------------------------------------------------------------------

/** Tracks which room tiles are occupied by already-placed buildings. */
class OccupiedTiles {
  constructor(
    readonly all: Set<number> = new Set<number>(),
    readonly nonRoads: Set<number> = new Set<number>(),
  ) {}

  static empty(): OccupiedTiles {
    return new OccupiedTiles();
  }

  /** Build from building offsets placed at a given anchor. */
  static fromOffsets(offsets: BuildingOffset[], anchorX: number, anchorY: number): OccupiedTiles {
    const all = new Set<number>();
    const nonRoads = new Set<number>();
    for (const { type, dx, dy } of offsets) {
      const key = tileKey(anchorX + dx, anchorY + dy);
      all.add(key);
      if (type !== STRUCTURE_ROAD) nonRoads.add(key);
    }
    return new OccupiedTiles(all, nonRoads);
  }

  /** Reserve the full size×size footprint of a stamp (all tiles treated as non-road). */
  static fromFootprint(stamp: Stamp, anchorX: number, anchorY: number): OccupiedTiles {
    const all = new Set<number>();
    const halfX = Math.floor(stamp.size.x / 2);
    const halfY = Math.floor(stamp.size.y / 2);
    for (let dx = -halfX; dx <= halfX; dx++) {
      for (let dy = -halfY; dy <= halfY; dy++) {
        all.add(tileKey(anchorX + dx, anchorY + dy));
      }
    }
    return new OccupiedTiles(all, new Set(all));
  }

  /** Returns a new OccupiedTiles combining both sets. */
  merge(other: OccupiedTiles): OccupiedTiles {
    const all = new Set(this.all);
    for (const k of other.all) all.add(k);
    const nonRoads = new Set(this.nonRoads);
    for (const k of other.nonRoads) nonRoads.add(k);
    return new OccupiedTiles(all, nonRoads);
  }

  /**
   * Returns true if placing `offsets` at (anchorX, anchorY) does not conflict with
   * already-occupied tiles, room bounds, or walls.
   * Roads may overlap with other roads if `canOverlapRoads` is true.
   */
  canPlace(offsets: BuildingOffset[], anchorX: number, anchorY: number, dtCM: CostMatrix, canOverlapRoads = false): boolean {
    for (const { type, dx, dy } of offsets) {
      const x = anchorX + dx;
      const y = anchorY + dy;
      if (x < EXIT_BUFFER || x > ROOM_MAX || y < EXIT_BUFFER || y > ROOM_MAX) return false;
      if (dtCM.get(x, y) === 0) return false; // wall
      const key = tileKey(x, y);
      if (type === STRUCTURE_ROAD && canOverlapRoads) {
        if (this.nonRoads.has(key)) return false;
      } else {
        if (this.all.has(key)) return false;
      }
    }
    return true;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A (position, rotation) candidate for stamp placement. */
type AnchorCandidate = { pos: Coord; rotation: Rotation };

/** Result of placing one stamp in a room. */
export interface StampPlacement {
  stamp: Stamp;
  anchorRoomPos: Coord;
  rotation: Rotation;
}

// ---------------------------------------------------------------------------
// StampPlacer
// ---------------------------------------------------------------------------

export class StampPlacer {
  private dtCM: CostMatrix;
  private controller: StructureController | undefined;
  private sources: SourceInfos<Source>[];

  constructor(
    private room: Room,
    cityInfo: CityInfo,
  ) {
    this.controller = room.controller;
    this.sources = cityInfo.getAllSources();
    this.dtCM = buildDistanceTransform(room);
  }

  place(stamps: Stamp[]): StampPlacement[] {
    if (stamps.length === 0) return [];

    const [anchoredPlacements, globalForbidden] = this.placeAnchoredStamps(stamps);
    const freeStamps = stamps.filter((s) => s.controllerRange === undefined);
    const jointPlacements = this.placeJointStamps(freeStamps, globalForbidden);

    return [...anchoredPlacements, ...jointPlacements];
  }

  // ---------------------------------------------------------------------------
  // Phase 1: stamps anchored near the controller
  // ---------------------------------------------------------------------------

  private placeAnchoredStamps(stamps: Stamp[]): [StampPlacement[], OccupiedTiles] {
    const placements: StampPlacement[] = [];
    let forbidden = OccupiedTiles.empty();

    for (const stamp of stamps) {
      if (stamp.controllerRange === undefined) continue;
      const placed = this.placeNearController(stamp, forbidden);
      if (!placed) continue;
      placements.push(placed);
      // Reserve the full footprint so no other stamp builds inside the controller work area.
      forbidden = forbidden.merge(OccupiedTiles.fromFootprint(stamp, placed.anchorRoomPos.x, placed.anchorRoomPos.y));
    }

    return [placements, forbidden];
  }

  /**
   * Place a controller-range stamp in the most open tile near the controller.
   * The stamp is symmetrical so only rotation 0 is tried.
   * Prefer max DT value (open space), tiebreak by proximity to controller.
   */
  private placeNearController(stamp: Stamp, forbidden: OccupiedTiles): StampPlacement | null {
    if (!this.controller) return null;
    const range = stamp.controllerRange!;
    const offsets = computeRotatedOffsets(stamp)[0];
    const { x: cx, y: cy } = this.controller.pos;
    const half = Math.max(Math.floor(stamp.size.x / 2), Math.floor(stamp.size.y / 2));

    // For every footprint tile to be within `range` of the controller, the anchor must
    // be within (range - half). This reduces the search to a tiny (≤25 tile) area.
    const searchRange = range - half;
    if (searchRange < 0) return null;

    const x1 = Math.max(EXIT_BUFFER, cx - searchRange);
    const x2 = Math.min(ROOM_MAX, cx + searchRange);
    const y1 = Math.max(EXIT_BUFFER, cy - searchRange);
    const y2 = Math.min(ROOM_MAX, cy + searchRange);

    let best: { pos: Coord; dtValue: number; dist: number } | null = null;

    for (let x = x1; x <= x2; x++) {
      for (let y = y1; y <= y2; y++) {
        if (!forbidden.canPlace(offsets, x, y, this.dtCM)) continue;
        const dtValue = this.dtCM.get(x, y);
        const dist = Math.max(Math.abs(x - cx), Math.abs(y - cy));
        if (!best || dtValue > best.dtValue || (dtValue === best.dtValue && dist < best.dist)) {
          best = { pos: { x, y }, dtValue, dist };
        }
      }
    }

    if (!best) return null;
    return { stamp, anchorRoomPos: best.pos, rotation: 0 };
  }

  // ---------------------------------------------------------------------------
  // Phase 2: joint placement of free stamps (center + flower)
  // ---------------------------------------------------------------------------

  private placeJointStamps(stamps: Stamp[], globalForbidden: OccupiedTiles): StampPlacement[] {
    if (stamps.length === 0) return [];

    const centerStamp = stamps[0]!;
    const centerOffsets = computeRotatedOffsets(centerStamp);

    // If a spawn already exists, the center stamp must align its spawn coord with it.
    const existingSpawn = this.room.find(FIND_MY_SPAWNS)[0];
    const spawnAligned = existingSpawn
      ? this.findSpawnAlignedPlacement(centerStamp, centerOffsets, globalForbidden, existingSpawn.pos)
      : null;

    const optimalCenter: AnchorCandidate | null = spawnAligned
      ? { pos: spawnAligned.anchorRoomPos, rotation: spawnAligned.rotation }
      : this.findOptimalCenter(centerOffsets, globalForbidden);

    if (!optimalCenter) return [];

    if (stamps.length === 1) {
      return [{ stamp: centerStamp, anchorRoomPos: optimalCenter.pos, rotation: optimalCenter.rotation }];
    }

    const flowerStamp = stamps[1]!;
    const flowerOffsets = computeRotatedOffsets(flowerStamp);
    const roadsCanOverlap = centerStamp.roadsCanOverlap === true && flowerStamp.roadsCanOverlap === true;

    // When spawn-constrained the center position is fixed; otherwise allow ±CENTER_DEVIATION_RADIUS.
    const centerCandidates = spawnAligned
      ? [{ pos: spawnAligned.anchorRoomPos, rotation: spawnAligned.rotation }]
      : this.buildCenterCandidates(optimalCenter.pos);

    const best = this.findBestPair(centerOffsets, flowerOffsets, centerCandidates, globalForbidden, optimalCenter.pos, roadsCanOverlap);

    if (!best) {
      // Could not place flower — fall back to center alone.
      return [{ stamp: centerStamp, anchorRoomPos: optimalCenter.pos, rotation: optimalCenter.rotation }];
    }

    return [
      { stamp: centerStamp, anchorRoomPos: best.center.pos, rotation: best.center.rotation },
      { stamp: flowerStamp, anchorRoomPos: best.flower.pos, rotation: best.flower.rotation },
    ];
  }

  /**
   * Full-room scan: find the (pos, rotation) that minimises the anchor score
   * (weighted distance to controller and sources).
   */
  private findOptimalCenter(offsets: RotatedOffsets, forbidden: OccupiedTiles): AnchorCandidate | null {
    let best: (AnchorCandidate & { score: number }) | null = null;

    for (let x = EXIT_BUFFER; x <= ROOM_MAX; x++) {
      for (let y = EXIT_BUFFER; y <= ROOM_MAX; y++) {
        if (this.dtCM.get(x, y) === 0) continue;
        for (const rotation of ROTATIONS) {
          if (!forbidden.canPlace(offsets[rotation], x, y, this.dtCM)) continue;
          const score = this.anchorScore({ x, y });
          if (!best || score < best.score) best = { pos: { x, y }, rotation, score };
        }
      }
    }

    return best;
  }

  /** All (pos, rotation) candidates within Chebyshev ≤ CENTER_DEVIATION_RADIUS of the optimal anchor. */
  private buildCenterCandidates(optimal: Coord): AnchorCandidate[] {
    const candidates: AnchorCandidate[] = [];
    for (let cx = optimal.x - CENTER_DEVIATION_RADIUS; cx <= optimal.x + CENTER_DEVIATION_RADIUS; cx++) {
      for (let cy = optimal.y - CENTER_DEVIATION_RADIUS; cy <= optimal.y + CENTER_DEVIATION_RADIUS; cy++) {
        if (cx < EXIT_BUFFER || cx > ROOM_MAX || cy < EXIT_BUFFER || cy > ROOM_MAX) continue;
        for (const rotation of ROTATIONS) {
          candidates.push({ pos: { x: cx, y: cy }, rotation });
        }
      }
    }
    return candidates;
  }

  /**
   * Joint search: for each center candidate, try every flower anchor within FLOWER_MAX_DIST.
   * Returns the pair that minimises (centerDist, flowerDist) lexicographically.
   */
  private findBestPair(
    centerOffsets: RotatedOffsets,
    flowerOffsets: RotatedOffsets,
    centerCandidates: AnchorCandidate[],
    globalForbidden: OccupiedTiles,
    optimal: Coord,
    roadsCanOverlap: boolean,
  ): { center: AnchorCandidate; flower: AnchorCandidate } | null {
    let best: { center: AnchorCandidate; flower: AnchorCandidate; centerDist: number; flowerDist: number } | null = null;

    for (const { pos: cPos, rotation: cRot } of centerCandidates) {
      if (!globalForbidden.canPlace(centerOffsets[cRot], cPos.x, cPos.y, this.dtCM)) continue;

      const centerDist = chebyshev(cPos, optimal);
      const flowerForbidden = globalForbidden.merge(OccupiedTiles.fromOffsets(centerOffsets[cRot], cPos.x, cPos.y));

      for (let fx = cPos.x - FLOWER_MAX_DIST; fx <= cPos.x + FLOWER_MAX_DIST; fx++) {
        for (let fy = cPos.y - FLOWER_MAX_DIST; fy <= cPos.y + FLOWER_MAX_DIST; fy++) {
          if (fx < EXIT_BUFFER || fx > ROOM_MAX || fy < EXIT_BUFFER || fy > ROOM_MAX) continue;
          const flowerDist = chebyshev({ x: fx, y: fy }, cPos);
          if (flowerDist > FLOWER_MAX_DIST) continue;

          for (const fRot of ROTATIONS) {
            if (!flowerForbidden.canPlace(flowerOffsets[fRot], fx, fy, this.dtCM, roadsCanOverlap)) continue;
            if (!best || centerDist < best.centerDist || (centerDist === best.centerDist && flowerDist < best.flowerDist)) {
              best = { center: { pos: cPos, rotation: cRot }, flower: { pos: { x: fx, y: fy }, rotation: fRot }, centerDist, flowerDist };
            }
          }
        }
      }
    }

    return best;
  }

  /**
   * Derive the center stamp anchor from an existing spawn:
   * for each spawn coord in the stamp × each rotation, back-compute where the anchor must be
   * so the stamp's spawn lands on the existing spawn.
   */
  private findSpawnAlignedPlacement(
    stamp: Stamp,
    offsets: RotatedOffsets,
    forbidden: OccupiedTiles,
    spawnPos: RoomPosition,
  ): StampPlacement | null {
    const lastStep = getLastStep(stamp);
    if (!lastStep?.buildings.spawn) return null;

    for (const spawnCoord of lastStep.buildings.spawn) {
      const rel = { x: spawnCoord.x - stamp.anchor.x, y: spawnCoord.y - stamp.anchor.y };

      for (const rotation of ROTATIONS) {
        const rotatedRel = rotateCoord(rel, rotation);
        const anchorX = spawnPos.x - rotatedRel.x;
        const anchorY = spawnPos.y - rotatedRel.y;
        if (anchorX < EXIT_BUFFER || anchorX > ROOM_MAX || anchorY < EXIT_BUFFER || anchorY > ROOM_MAX) continue;
        if (!forbidden.canPlace(offsets[rotation], anchorX, anchorY, this.dtCM)) continue;
        return { stamp, anchorRoomPos: { x: anchorX, y: anchorY }, rotation };
      }
    }
    return null;
  }

  /**
   * Score for a potential center anchor. Lower is better.
   * Controller proximity has weight CONTROLLER_DISTANCE_WEIGHT, nearest source has weight 1.
   */
  private anchorScore(pos: Coord): number {
    const controllerDist = this.controller ? chebyshev(pos, this.controller.pos) : 0;
    let minSourceDist = 0;
    if (this.sources.length > 0) {
      minSourceDist = Infinity;
      for (const s of this.sources) {
        const d = chebyshev(pos, s.pos);
        if (d < minSourceDist) minSourceDist = d;
      }
    }
    return CONTROLLER_DISTANCE_WEIGHT * controllerDist + minSourceDist;
  }
}

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

function chebyshev(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function buildDistanceTransform(room: Room): CostMatrix {
  const terrain = room.getTerrain();
  const terrainCM = new PathFinder.CostMatrix();
  for (let x = 0; x < 50; x++) {
    for (let y = 0; y < 50; y++) {
      if (terrain.get(x, y) === TERRAIN_MASK_WALL) terrainCM.set(x, y, 255);
    }
  }
  return distanceTransform(room, terrainCM);
}
