import { IsAtDistance } from './IsAtDistance';

export class IsNextToTarget extends IsAtDistance {
  constructor(
    protected getMemory: () => NodeMemory,
    protected agent: Id<Creep>,
  ) {
    super(getMemory, agent, 1);
  }
}
