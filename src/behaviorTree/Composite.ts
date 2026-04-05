import { Node } from './Node';
import State from './State';

export abstract class Composite<Agent, Context> extends Node<Agent, Context> {
  constructor(
    getMemory: () => NodeMemory,
    agent: Agent,
    protected children: Node<Agent, Context>[],
  ) {
    super(getMemory, agent);
  }
  getChildren = () => this.children;

  reset() {
    this.setState(State.READY);
    this.children.forEach((child) => child.reset());
  }

  abort() {
    if (!this.is(State.RUNNING)) {
      return;
    }
    this.children.forEach((child) => child.abort());
    this.reset();
  }
}
