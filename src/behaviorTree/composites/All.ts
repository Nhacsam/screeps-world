import { Composite } from '../Composite';
import State from '../State';

/**
 * The child nodes are executed concurrently until all child nodes move to a completed state.
 */
export class All<A, C> extends Composite<A, C> {
  run(context: C): State {
    for (const child of this.children) {
      if (child.getState() === State.READY || child.getState() === State.RUNNING) {
        child.step(context);
      }
    }

    if (this.children.every((child) => child.is(State.SUCCEEDED) || child.is(State.FAILED))) {
      // If any of our child nodes have succeeded then this node has also succeeded, otherwise it has failed.
      return this.children.some((child) => child.is(State.SUCCEEDED)) ? State.SUCCEEDED : State.FAILED;
    }

    return State.RUNNING;
  }
}
