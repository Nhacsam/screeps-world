import { Composite } from '../Composite';
import State from '../State';

/**
 * The child nodes are executed concurrently until one fails or all succeed.
 */
export class Parallel<A, C> extends Composite<A, C> {
  run(context: C): State {
    for (const child of this.children) {
      if (child.getState() === State.READY || child.getState() === State.RUNNING) {
        child.step(context);
      }
    }

    if (this.children.some((child) => child.is(State.FAILED))) {
      // Abort every running child.
      for (const child of this.children) {
        if (child.getState() === State.RUNNING) {
          child.abort();
        }
      }

      return State.FAILED;
    }

    if (this.children.every((child) => child.is(State.SUCCEEDED))) {
      return State.SUCCEEDED;
    }

    return State.RUNNING;
  }
}
