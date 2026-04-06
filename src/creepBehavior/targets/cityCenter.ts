import { CityInfo } from '../../room/CityInfo';

export const cityCenter =
  () =>
  (id: Id<Creep>): RoomPosition | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) return undefined;

    const cityInfo = CityInfo.fromRoomName(creep.memory.city);
    if (!cityInfo) return undefined;

    return cityInfo.getRoomCenter();
  };
