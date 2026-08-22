import {TransitionError} from "../errors.mjs";
import type {TransitionDefinition, TransitionKey} from "../interfaces.mjs";

export class Transitions<
    TState extends object,
    TDefinition extends TransitionDefinition<TState, TransitionKey<TDefinition>>,
> {
    constructor(public readonly states: TDefinition) {
        if (typeof states !== "object" || states === null || Array.isArray(states)) {
            throw new TransitionError("INVALID_DEFINITION", "Transition definition must be an object");
        }

        const entries = this.entries();
        if (entries.length === 0) {
            throw new TransitionError("INVALID_DEFINITION", "Transition definition must not be empty");
        }

        const keys = new Set(entries.map(([key]) => key));
        for (const [key, state] of entries) {
            if (typeof state?.name !== "string" || state.name.trim().length === 0) {
                throw new TransitionError("INVALID_DEFINITION", `State "${key}" must have a non-empty name`);
            }

            if (typeof state.when !== "object" || state.when === null || Reflect.ownKeys(state.when).length === 0) {
                throw new TransitionError("INVALID_DEFINITION", `State "${key}" must have a non-empty pattern`);
            }

            if (!Array.isArray(state.to)) {
                throw new TransitionError("INVALID_DEFINITION", `State "${key}" must have a target list`);
            }

            for (const target of state.to) {
                if (!keys.has(target)) {
                    throw new TransitionError(
                        "INVALID_DEFINITION",
                        `State "${key}" references unknown target "${target}"`,
                    );
                }
            }
        }
    }

    public resolve(state: TState): TransitionKey<TDefinition> {
        const matches = this.entries().filter(([, definition]) => this.matches(state, definition.when));

        if (matches.length === 0) {
            throw new TransitionError("STATE_NOT_FOUND", "State does not match any transition");
        }

        if (matches.length > 1) {
            const names = matches.map(([, definition]) => `"${definition.name}"`).join(", ");
            throw new TransitionError("STATE_AMBIGUOUS", `State matches multiple transitions: ${names}`);
        }

        return matches[0]![0];
    }

    public can(from: TState, to: TState): boolean {
        const fromKey = this.resolve(from);
        const toKey = this.resolve(to);

        return this.states[fromKey].to.includes(toKey);
    }

    public assert(from: TState, to: TState): void {
        const fromKey = this.resolve(from);
        const toKey = this.resolve(to);

        if (!this.states[fromKey].to.includes(toKey)) {
            const fromName = this.states[fromKey].name;
            const toName = this.states[toKey].name;
            throw new TransitionError(
                "TRANSITION_NOT_ALLOWED",
                `Transition from "${fromName}" to "${toName}" is not allowed`,
            );
        }
    }

    private entries(): [TransitionKey<TDefinition>, TDefinition[TransitionKey<TDefinition>]][] {
        return Object.entries(this.states) as [TransitionKey<TDefinition>, TDefinition[TransitionKey<TDefinition>]][];
    }

    private matches(state: TState, pattern: object): boolean {
        const record = state as Record<PropertyKey, unknown>;
        const expected = pattern as Record<PropertyKey, unknown>;

        return Reflect.ownKeys(expected).every((key) => Object.is(record[key], expected[key]));
    }
}
