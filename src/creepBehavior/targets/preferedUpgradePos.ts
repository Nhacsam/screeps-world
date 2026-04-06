import { CityInfo } from '../../room/CityInfo';

export const preferedUpgradePos =
  () =>
  (id: Id<Creep>): RoomPosition | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) {
      return undefined;
    }

    const cityInfo = CityInfo.fromRoomName(creep.room.name);
    for (const pos of cityInfo?.getUpgradeControllerPreferredPositions()) {
      if (pos.lookFor(LOOK_CREEPS).length > 0) {
        continue;
      }
      return pos;
    }
    return undefined;
  };
