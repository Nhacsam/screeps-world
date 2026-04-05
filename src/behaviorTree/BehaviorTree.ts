import { State } from './State';
import { Node, NodeMemory } from './Node';
import { TreeBuilder } from './wrappers';

export class BehaviorTree<A, Context> {
  private rootNode: Node<A, Context>;

  constructor(
    protected memory: NodeMemory,
    agent: A,
    builder: TreeBuilder<A, Context>,
  ) {
    this.rootNode = builder(memory, agent);
  }

  public isRunning(): boolean {
    return this.rootNode.getState() === State.RUNNING;
  }

  public getState(): State {
    return this.rootNode.getState();
  }

  public step(context: Context): void {
    // If the root node has already been stepped to completion then we need to reset it.
    if (this.rootNode.getState() === State.SUCCEEDED || this.rootNode.getState() === State.FAILED) {
      this.rootNode.reset();
    }

    try {
      this.rootNode.step(context);
    } catch (exception) {
      console.error(exception);
    }
  }

  public reset(): void {
    this.rootNode.reset();
  }
}
