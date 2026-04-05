import { Composite } from '../Composite';
import State from '../State';

/**
 * The child nodes are executed in sequence until one succeeds or all fail.
 */
export class Selector<A, C> extends Composite<A, C> {
  run(context: C): State {
    for (const child of this.children) {
      if (child.getState() === State.READY || child.getState() === State.RUNNING) {
        child.step(context);
      }

      if (child.getState() === State.FAILED) {
        continue;
      }

      if (child.getState() === State.SUCCEEDED) {
        return State.SUCCEEDED;
      }

      if (child.getState() === State.RUNNING) {
        return State.RUNNING;
      }

      throw new Error('child node was not in an expected state.');
    }

    return State.FAILED;
  }
}
