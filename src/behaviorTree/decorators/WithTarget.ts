import { Decorator } from '../Decorator';
import { Node } from '../Node';
import State from '../State';

export interface WithTargetContext {
  target?: Id<any> | RoomPosition;
}

declare global {
  interface NodeMemory {
    target?: Id<any> | { x: number; y: number; room: string };
  }
}

export class WithTarget<Agent, Context extends WithTargetContext> extends Decorator<Agent, Context> {
  private target?: Id<any> | RoomPosition;

  constructor(
    memory: NodeMemory,
    agent: Agent,
    protected child: Node<Agent, Context>,
    protected targetSelector: (agent: Agent, context?: Context) => Id<any> | RoomPosition | undefined,
  ) {
    super(memory, agent, child);
    if (memory.target) {
      this.target = this.deserialize(memory.target);
    }
  }

  static resolveTarget(target?: Id<any> | RoomPosition) {
    if (!target) {
      return undefined;
    }
    if (target instanceof RoomPosition) {
      return target;
    }
    return Game.getObjectById(target);
  }

  run(context: Context): State {
    if (!this.getTarget()) {
      this.setTarget(this.targetSelector(this.getAgent()));
    }

    const newContext = {
      ...context,
      target: this.getTarget(),
    };

    if (this.child.getState() === State.READY || this.child.getState() === State.RUNNING) {
      this.child.step(newContext);
    }
    return this.child.getState();
  }

  getTarget() {
    return this.target;
  }

  setTarget(target?: Id<any> | RoomPosition) {
    this.target = target;
    this.memory.target = this.serialize(target);
  }

  serialize(target?: Id<any> | RoomPosition): Id<any> | { x: number; y: number; room: string } | undefined {
    if (!target) {
      return undefined;
    }
    if (typeof target === 'string') {
      return target;
    }

    return {
      x: target.x,
      y: target.y,
      room: target.roomName,
    };
  }

  deserialize(
    target?: Id<any> | { x: number; y: number; room: string } | undefined,
  ): Id<any> | RoomPosition | undefined {
    if (!target) {
      return undefined;
    }
    if (typeof target === 'string') {
      return target;
    }

    return new RoomPosition(target.x, target.y, target.room);
  }
}
