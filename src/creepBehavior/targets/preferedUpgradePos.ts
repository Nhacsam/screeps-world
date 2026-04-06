import { CityInfo } from '../../room/CityInfo';

export const preferedUpgradePos =
  () =>
  (id: Id<Creep>): RoomPosition | undefined => {
    const creep = Game.getObjectById(id);
    if (!creep) {
      return undefined;
    }

    const cityInfo = CityInfo.fromRoomName(creep.room.name);

    const candidates = cityInfo
      ?.getUpgradeControllerPreferredPositions()
      .filter((pos) => pos.lookFor(LOOK_CREEPS).length === 0);

    return creep.pos.findClosestByPath(candidates) || undefined;
  };
