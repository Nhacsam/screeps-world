import { toPos, fromPos } from '../utils/pos';

export interface SourceInfos<SourceType extends _HasId> {
  id: Id<SourceType>;
  distanceToCenter: number;
  pos: RoomPosition;
  maxNumberOfHarvesters: number;
  /** All walkable tiles at range 1 from the source. */
  harvesterPos: RoomPosition[];
  maxCapacity: number;
  ticksToRegeneration: number;
}

export interface SerializedSourceInfo {
  id: string;
  distanceToCenter: number;
  pos: RoomCoord;
  maxNumberOfHarvesters: number;
  harvesterPos: RoomCoord[];
  maxCapacity: number;
  ticksToRegeneration: number;
}

export function serializeSource<T extends _HasId>(s: SourceInfos<T>): SerializedSourceInfo {
  return {
    id: s.id as string,
    distanceToCenter: s.distanceToCenter,
    pos: fromPos(s.pos),
    maxNumberOfHarvesters: s.maxNumberOfHarvesters,
    harvesterPos: s.harvesterPos.map(fromPos),
    maxCapacity: s.maxCapacity,
    ticksToRegeneration: s.ticksToRegeneration,
  };
}

export function deserializeSource<T extends _HasId>(s: SerializedSourceInfo): SourceInfos<T> {
  return {
    id: s.id as Id<T>,
    distanceToCenter: s.distanceToCenter,
    pos: toPos(s.pos),
    maxNumberOfHarvesters: s.maxNumberOfHarvesters,
    harvesterPos: s.harvesterPos.map(toPos),
    maxCapacity: s.maxCapacity,
    ticksToRegeneration: s.ticksToRegeneration,
  };
}
