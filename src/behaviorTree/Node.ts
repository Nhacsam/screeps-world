import State from './State';

declare global {
  interface NodeMemory {
    state?: State;
    type?: string;
    children?: {
      [node: string]: NodeMemory;
    };
    child?: NodeMemory;
  }
}

export abstract class Node<Agent, Context> {
  private state = State.READY;

  constructor(
    protected getMemory: () => NodeMemory,
    protected agent: Agent,
  ) {
    const type = this.constructor.name;
    const memory = getMemory();
    if (!memory.type || memory.type !== type) {
      memory.type = type;
      memory.state = State.READY;
    } else if (memory.state) {
      this.state = memory.state;
    }
  }

  abstract run(context?: Context): State;

  get memory() {
    return this.getMemory();
  }

  getAgent(): Agent {
    return this.agent;
  }

  step(context: Context): void {
    try {
      const state = this.run(context);
      this.setState(state);
    } catch (e) {
      console.log(e);
      this.setState(State.FAILED);
    }
  }

  setState(state: State) {
    if (this.state === state) {
      return;
    }

    this.state = state;
    this.memory.state = state;
  }

  getState() {
    return this.state;
  }

  is(value: State): boolean {
    return this.getState() === value;
  }

  reset(): void {
    this.setState(State.READY);
  }

  abort() {
    if (!this.is(State.RUNNING)) {
      return;
    }
    this.reset();
  }
}
