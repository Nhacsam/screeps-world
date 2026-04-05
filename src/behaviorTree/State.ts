/**
 * Enumeration of node state types.
 */
export enum State {
  READY = 'READY',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export { State as default };

export type CompleteState = State.SUCCEEDED | State.FAILED;
export type AnyState = State.READY | State.RUNNING | CompleteState;
