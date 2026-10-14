import {assert, type Fn} from "@typesec/the";
import {async} from "@typesec/the/async";

/**
 * A pending Promise, a resolved value, or a cached factory error; T is the resolved value type.
 * @category lib
 */
export type RefResult<T> =
    | {state: "pending"; value: Promise<T>}
    | {state: "persisted"; value: T}
    | {state: "error"; error: unknown};
/**
 * The slot state, including none before the factory is first called.
 * @category lib
 */
export type RefState<T> = RefResult<T> | {state: "none"};
/**
 * Unwraps a Promise or PromiseLike factory result to its resolved value type; synchronous types stay unchanged.
 * @category lib
 */
export type RefValue<T> = T extends PromiseLike<infer R> ? R : T;
/**
 * The ensure result: T for a synchronous factory, or R | Promise<R> for a Promise or PromiseLike factory.
 * @category lib
 */
export type RefReturn<T> = T extends PromiseLike<infer R> ? R | Promise<R> : T;

/**
 * A lazy slot accepting synchronous, Promise, or PromiseLike factories; T is the factory's return type.
 *
 * ensure returns a synchronous value or the shared pending Promise. Resolution stores the value;
 * rejection stores the error, which subsequent ensure calls throw until update or replace changes the slot.
 * @category lib
 * @example new Ref(() => 42).ensure()
 * @example await new Ref(async () => 42).ensure()
 */
export class Ref<T> {
    /** The held value, pending computation, or error; initially empty. */
    ref: RefState<RefValue<T>> = {state: "none"};

    readonly #factory: Fn<[], T>;

    /** Creates an empty slot with a synchronous, Promise, or PromiseLike factory; does not call it yet. */
    constructor(factory: Fn<[], T>) {
        this.#factory = factory;
    }

    /** Whether a value or pending Promise is held; false for none and error. */
    public get persisted(): boolean {
        return this.ref.state === "persisted" || this.ref.state === "pending";
    }

    /** Runs the factory on first use; returns the shared Promise while pending, the value when ready, or throws the cached error. */
    public ensure(): RefReturn<T> {
        if (this.ref.state === "none") {
            this.ref = this.#update();
        }

        if (this.ref.state === "error") {
            throw this.ref.error;
        }

        assert(this.ref.state === "persisted" || this.ref.state === "pending", "Ref is in an unexpected state");

        return this.ref.value as RefReturn<T>;
    }

    /** Replaces the slot with a value, Promise, or PromiseLike; tracks async settlement and ignores the old pending result. */
    public replace(value: T | RefValue<T>) {
        this.ref = this.#result(value);
    }

    /** Installs an explicit result, or calls the factory again and tracks its synchronous result or async settlement. */
    public update(ref?: RefResult<RefValue<T>>) {
        this.ref = ref ?? this.#update();
    }

    #update(): RefResult<RefValue<T>> {
        try {
            return this.#result(this.#factory());
        } catch (error) {
            return {state: "error", error};
        }
    }

    #result(value: T | RefValue<T>): RefResult<RefValue<T>> {
        if (async.isThenable(value)) {
            const promise = Promise.resolve(value) as Promise<RefValue<T>>;
            const pending = {state: "pending", value: promise} as const;
            promise.then(
                (value) => {
                    if (this.ref === pending) this.ref = {state: "persisted", value};
                },
                (error) => {
                    if (this.ref === pending) this.ref = {state: "error", error};
                },
            );

            return pending;
        }

        return {state: "persisted", value: value as RefValue<T>};
    }
}
