import { State } from './State';
import { Node } from './Node';

export abstract class Condition<Agent, Context> extends Node<Agent, Context> {
  run(context: Context): State {
    return this.check(context) ? State.SUCCEEDED : State.FAILED;
  }

  abstract check(context: Context): boolean;
}
