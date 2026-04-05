import { BehaviourTreeOptions } from "../../BehaviourTreeOptions";
import { NodeDetails } from "../Node";
import State, { CompleteState } from "../../State";
import { Agent } from "../../Agent";
import Leaf from "./Leaf";
import Lookup from "../../Lookup";
import Attribute from "../../attributes/Attribute";

/**
 * An Action leaf node.
 * This represents an immediate or ongoing state of behaviour.
 */
export default class Action extends Leaf {
    /**
     * @param attributes The node attributes.
     * @param options The behaviour tree options.
     * @param actionName The action name.
     * @param actionArguments The array of action arguments.
     */
    constructor(
        attributes: Attribute[],
        options: BehaviourTreeOptions,
        private actionName: string,
        public actionArguments: any[]
    ) {
        super("action", attributes, options);
    }

    /**
     * Called when the node is being updated.
     * @param agent The agent.
     */
    protected onUpdate(agent: Agent): void {
        // Attempt to get the invoker for the action function.
        const actionFuncInvoker = Lookup.getFuncInvoker(agent, this.actionName);

        // The action function should be defined.
        if (actionFuncInvoker === null) {
            throw new Error(
                `cannot update action node as the action '${this.actionName}' function is not defined on the agent and has not been registered`
            );
        }

        let actionFunctionResult: CompleteState;

        try {
            actionFunctionResult = actionFuncInvoker(this.actionArguments) as CompleteState;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`action function '${this.actionName}' threw: ${error.stack}`);
            } else {
                throw new Error(`action function '${this.actionName}' threw: ${error}`);
            }
        }

        // Validate the returned value.
        this.validateUpdateResult(actionFunctionResult);

        // Set the state of this node, this may be undefined, which just means that the node is still in the 'RUNNING' state.
        this.setState(actionFunctionResult || State.RUNNING);
    }

    /**
     * Gets the name of the node.
     */
    getName = () => this.actionName;

    /**
     * Reset the state of the node.
     */
    reset = () => {
        this.setState(State.READY);
    };

    /**
     * Gets the details of this node instance.
     * @returns The details of this node instance.
     */
    public getDetails(): NodeDetails {
        return {
            ...super.getDetails(),
            args: this.actionArguments
        };
    }

    /**
     * Called when the state of this node changes.
     * @param previousState The previous node state.
     */
    protected onStateChanged(previousState: State): void {
        this.options.onNodeStateChange?.({
            id: this.uid,
            type: this.getType(),
            args: this.actionArguments,
            while: this.attributes.while?.getDetails(),
            until: this.attributes.until?.getDetails(),
            entry: this.attributes.entry?.getDetails(),
            step: this.attributes.step?.getDetails(),
            exit: this.attributes.exit?.getDetails(),
            previousState,
            state: this.getState()
        });
    }

    /**
     * Validate the result of an update function call.
     * @param result The result of an update function call.
     */
    private validateUpdateResult = (result: CompleteState | State.RUNNING) => {
        switch (result) {
            case State.SUCCEEDED:
            case State.FAILED:
            case State.RUNNING:
            case undefined:
                return;
            default:
                throw new Error(
                    `expected action function '${this.actionName}' to return an optional State.SUCCEEDED or State.FAILED value but returned '${result}'`
                );
        }
    };
}
