import { Composite } from './Composite';
import { Node } from './Node';

export abstract class Decorator<A, Context> extends Composite<A, Context> {
  constructor(
    getMemory: () => NodeMemory,
    agent: A,
    protected child: Node<A, Context>,
  ) {
    super(getMemory, agent, [child]);
  }
}
