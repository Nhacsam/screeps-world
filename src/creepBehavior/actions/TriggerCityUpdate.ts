import { State } from '../../behaviorTree';
import { CityInfo } from '../../room/CityInfo';
import { CreepAction } from '../CreepAction';

export class TriggerCityUpdate extends CreepAction {
  runCreep(creep: Creep) {
    const cityInfo = CityInfo.fromRoomName(creep.memory.city);
    if (!cityInfo) return State.FAILED;

    cityInfo.update();

    return State.SUCCEEDED;
  }
}
