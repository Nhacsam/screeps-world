import { Decorator } from '../Decorator';
import State from '../State';

/**
 * This node wraps a single child and will always move to the 'FAILED' state when the child moves to a 'SUCCEEDED' or 'FAILED' state.
 */
export class Fail<Agent, Context> extends Decorator<Agent, Context> {
  run(context: Context): State {
    if (this.child.getState() === State.READY || this.child.getState() === State.RUNNING) {
      this.child.step(context);
    }

    // The state of this node will depend in the state of its child.
    switch (this.child.getState()) {
      case State.RUNNING:
        return State.RUNNING;

      case State.SUCCEEDED:
      case State.FAILED:
        return State.FAILED;

      default:
        return State.READY;
    }
  }
}
