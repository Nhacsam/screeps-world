import { Composite } from '../Composite';
import State from '../State';

/**
 * The child nodes are executed in sequence until one fails or all succeed.
 */
export class Sequence<A, C> extends Composite<A, C> {
  run(context: C): State {
    for (const child of this.children) {
      if (child.getState() === State.READY || child.getState() === State.RUNNING) {
        child.step(context);
      }

      if (child.getState() === State.SUCCEEDED) {
        continue;
      }

      if (child.getState() === State.FAILED) {
        return State.FAILED;
      }

      if (child.getState() === State.RUNNING) {
        return State.RUNNING;
      }

      throw new Error('child node was not in an expected state.');
    }

    return State.SUCCEEDED;
  }
}
