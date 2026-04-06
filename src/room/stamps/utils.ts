import { Stamp, StampStep } from './Stamp';

// ---------------------------------------------------------------------------
// Rotation
// ---------------------------------------------------------------------------

export type Rotation = 0 | 1 | 2 | 3; // 0°, 90°, 180°, 270°

export function rotateCoord(coord: Coord, rotation: Rotation): Coord {
  const { x, y } = coord;
  switch (rotation) {
    case 0: return { x, y };
    case 1: return { x: y, y: -x };
    case 2: return { x: -x, y: -y };
    case 3: return { x: -y, y: x };
  }
}

export function translateCoord(
  stampCoord: Coord,
  stampAnchor: Coord,
  anchorRoomPos: Coord,
  rotation: Rotation,
): Coord {
  const rel = rotateCoord(
    { x: stampCoord.x - stampAnchor.x, y: stampCoord.y - stampAnchor.y },
    rotation,
  );
  return { x: anchorRoomPos.x + rel.x, y: anchorRoomPos.y + rel.y };
}

// ---------------------------------------------------------------------------
// Stamp step helpers
// ---------------------------------------------------------------------------

export type BuildingEntry = { type: BuildableStructureConstant; coord: Coord };

export function getLastStep(stamp: Stamp): StampStep | undefined {
  return stamp.steps[stamp.steps.length - 1];
}

export function getBuildingEntries(step: StampStep): BuildingEntry[] {
  const result: BuildingEntry[] = [];
  for (const [type, coords] of Object.entries(step.buildings) as [BuildableStructureConstant, Coord[] | undefined][]) {
    if (!coords) continue;
    for (const coord of coords) result.push({ type, coord });
  }
  return result;
}
