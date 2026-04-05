import { Action } from './Action';
import { Composite } from './Composite';
import { All, Parallel, Selector, Sequence } from './composites';
import { Condition } from './Condition';
import { Decorator } from './Decorator';
import { Fail, Flip, Succeed, TargetSelector, WithTarget, WithTargetContext } from './decorators';
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
  ...params: any[]
): TreeBuilder<Agent, Context> => {
  return (memory: NodeMemory, agent: Agent) => new Base(memory, agent, ...params);
};

const wrapComposite = <T extends new (...args: any[]) => Composite<any, any>>(Base: T) => {
  return <Agent, Context>(children: Array<TreeBuilder<Agent, Context>>): TreeBuilder<Agent, Context> =>
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

const wrapDecorator = <T extends new (...args: any[]) => Decorator<any, any>>(Base: T) => {
  return <Agent, Context>(child: TreeBuilder<Agent, Context>, ...params: any[]): TreeBuilder<Agent, Context> =>
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

export const withTarget = <Agent, Context extends WithTargetContext>(
  selector: TargetSelector<Agent, Context>,
  child: TreeBuilder<Agent, Context>,
): TreeBuilder<Agent, Context> => {
  return (memory: NodeMemory, agent: Agent) => {
    if (!memory.child) {
      memory.child = {};
    }

    return new WithTarget<Agent, Context>(memory, agent, child(memory.child, agent), selector);
  };
};
