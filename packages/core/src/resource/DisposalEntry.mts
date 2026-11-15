import {dispose} from "../runtime/dispose.mjs";

/**
 * Progress of a cleanup attempt; `settled` includes success and failure.
 * @internal
 */
export type DisposalEntryState = "idle" | "disposing" | "settled";

/**
 * An internal resource entry that memoizes one cleanup attempt.
 * @internal
 */
export class DisposalEntry {
    /** The resource held until its owner releases this entry. */
    public readonly resource: Disposable | AsyncDisposable;

    #state: DisposalEntryState = "idle";
    #pending: Promise<void> | undefined;
    #settled: PromiseWithResolvers<void> | undefined;

    /** Holds the resource without starting cleanup. */
    constructor(resource: Disposable | AsyncDisposable) {
        this.resource = resource;
    }

    /** Current progress of the single cleanup attempt. */
    public get state(): DisposalEntryState {
        return this.#state;
    }

    /** Resolves once the cleanup attempt settles, never rejecting; waiting on it does not start cleanup. */
    public get settled(): Promise<void> {
        if (this.#state === "settled") {
            return Promise.resolve();
        }

        this.#settled ??= Promise.withResolvers<void>();

        return this.#settled.promise;
    }

    /** Starts cleanup in a microtask and always returns the same promise, including after rejection. */
    public dispose(): Promise<void> {
        if (this.#pending) {
            return this.#pending;
        }

        this.#state = "disposing";
        this.#pending = Promise.resolve()
            .then(() => dispose(this.resource))
            .finally(() => {
                this.#state = "settled";
                this.#settled?.resolve();
            });

        return this.#pending;
    }
}
