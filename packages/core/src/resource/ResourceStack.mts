import {assert, AssertionException} from "@typesec/the/assert";
import {identify} from "@typesec/the/object";
import type {Tracer} from "@typesec/tracer";
import {DisposalEntry} from "./DisposalEntry.mjs";

/** The id of the stack that holds each resource, so no resource is adopted by two stacks. */
const holders = new WeakMap<Disposable | AsyncDisposable, string>();

/**
 * Owned resources disposed in reverse order, plus the pending work that disposal waits for.
 * @internal
 */
export class ResourceStack {
    readonly #id: string;
    readonly #trace: Tracer;
    readonly #resources: DisposalEntry[] = [];
    readonly #entries = new WeakMap<Disposable | AsyncDisposable, DisposalEntry>();
    readonly #pending = new Set<Promise<void>>();

    /** Names the stack in traces and in the refusal of a resource another stack holds. */
    constructor(id: string, trace: Tracer) {
        this.#id = id;
        this.#trace = trace;
    }

    /** Adds a resource once by identity and reports whether it is new; a resource another stack holds is refused. */
    public push(resource: Disposable | AsyncDisposable): boolean {
        if (this.#entries.has(resource)) {
            return false;
        }

        const holder = holders.get(resource);
        assert(
            holder === undefined,
            () => new AssertionException(this.#trace.format("own(%s): owned by %s", identify(resource), holder)),
        );

        const entry = new DisposalEntry(resource);
        holders.set(resource, this.#id);
        this.#entries.set(resource, entry);
        this.#resources.push(entry);

        return true;
    }

    /** Disposes one resource ahead of the drain, taking it out of the stack; a drain still waits for the attempt. */
    public release(resource: Disposable | AsyncDisposable): Promise<void> {
        const entry = this.#entries.get(resource);
        assert(entry, () => new AssertionException(this.#trace.format("release(%s): not owned", identify(resource))));

        const attempt = entry.dispose();
        const index = this.#resources.indexOf(entry);
        if (index >= 0) {
            this.#resources.splice(index, 1);

            // Out of the stack, the attempt still counts as pending work; its failure stays with the caller.
            this.join(attempt);
        }

        return attempt;
    }

    /** Makes a drain wait for the work; its failure goes to `onError` when given, and otherwise stays with the work's holder. */
    public join(work: Promise<unknown>, onError?: (error: unknown) => void): void {
        const settle = () => void this.#pending.delete(pending);
        const pending = work.then(settle, (error) => {
            onError?.(error);
            settle();
        });

        this.#pending.add(pending);
    }

    /** Pending work plus resources still in the stack; a drain is complete when this reaches zero. */
    public get size(): number {
        return this.#pending.size + this.#resources.length;
    }

    /** What a drain waits for next: all pending work first, then the cleanup of the most recent resource. */
    public next(): Promise<unknown> {
        return this.#pending.size ? Promise.all(this.#pending) : this.#resources.pop()!.dispose();
    }
}
