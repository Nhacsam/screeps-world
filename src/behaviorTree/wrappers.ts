import { Action } from './Action';
import { Composite } from './Composite';
import { All, Parallel, Selector, Sequence } from './composites';
import { Condition } from './Condition';
import { Decorator } from './Decorator';
import { Fail, Flip, Succeed, WithTarget } from './decorators';
import { Node } from './Node';

export type TreeBuilder<Agent, Context = any> = (memory: NodeMemory, agent: Agent) => Node<Agent, Context>;

export const action = <Agent, Context, T extends new (...args: any[]) => Action<Agent, Context>>(
  Base: T,
  ...params: any[]
): TreeBuilder<Agent, Context> => {
  return (memory: NodeMemory, agent: Agent) => new Base(memory, agent, ...params);
};

export const condition = <Agent, Context, T extends new (...args: any[]) => Condition<Agent, Context>>(
  Base: T,
): TreeBuilder<Agent, Context> => {
  return (memory: NodeMemory, agent: Agent) => new Base(memory, agent);
};

const wrapComposite = <Agent, Context, T extends new (...args: any[]) => Composite<Agent, Context>>(Base: T) => {
  return (children: Array<TreeBuilder<Agent>>): TreeBuilder<Agent, Context> =>
    (memory: NodeMemory, agent: Agent) =>
      new Base(
        memory,
        agent,
        children.map((builder, key: number) => {
          if (!memory.children) {
            memory.children = {};
          }
          const mKey = `c${key}`;
          if (!memory.children[mKey]) {
            memory.children[mKey] = {};
          }

          return builder(memory.children[mKey], agent);
        }),
      );
};

export const all = wrapComposite(All);
export const parallel = wrapComposite(Parallel);
export const selector = wrapComposite(Selector);
export const sequence = wrapComposite(Sequence);

const wrapDecorator = <Agent, Context, T extends new (...args: any[]) => Decorator<Agent, Context>>(Base: T) => {
  return (child: TreeBuilder<Agent>, ...params: any[]): TreeBuilder<Agent, Context> =>
    (memory: NodeMemory, agent: Agent) => {
      if (!memory.child) {
        memory.child = {};
      }

      return new Base(memory, agent, child(memory.child, agent), ...params);
    };
};

export const fail = wrapDecorator(Fail);
export const flip = wrapDecorator(Flip);
export const succeed = wrapDecorator(Succeed);
export const withTarget = wrapDecorator(WithTarget);
