import { IsAtDistance } from './IsAtDistance';

export class IsNextToTarget extends IsAtDistance {
  constructor(
    protected memory: NodeMemory,
    protected agent: Id<Creep>,
  ) {
    super(memory, agent, 1);
  }
}
