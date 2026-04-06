import { CityInfo } from '../../room/CityInfo';

export const nearestUnexploredRoom =
  () =>
  (id: Id<Creep>): RoomPosition | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) return undefined;

    const cityInfo = CityInfo.fromRoomName(creep.memory.city);
    if (!cityInfo) return undefined;

    const nearest = cityInfo.getNearstUnexploredRoom();
    if (!nearest) {
      return undefined;
    }
    return new RoomPosition(25, 25, nearest);
  };
