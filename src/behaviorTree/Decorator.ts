import { Composite } from './Composite';
import { Node } from './Node';

export abstract class Decorator<A, Context> extends Composite<A, Context> {
  constructor(
    memory: NodeMemory,
    agent: A,
    protected child: Node<A, Context>,
  ) {
    super(memory, agent, [child]);
  }
}
