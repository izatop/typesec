import {is, isInstance} from "@typesec/the";
import type {Fn, Promisify, Rec} from "@typesec/the/type";

/**
 * Whether the value, an object or a function, implements `Symbol.asyncDispose`.
 * @category guard
 */
export function isAsyncDisposable(res: unknown): res is AsyncDisposable {
    return (isInstance(res) || is(res, "function")) && Reflect.has(res, Symbol.asyncDispose);
}

/**
 * Whether the value, an object or a function, implements `Symbol.dispose`.
 * @category guard
 */
export function isDisposable(res: unknown): res is Disposable {
    return (isInstance(res) || is(res, "function")) && Reflect.has(res, Symbol.dispose);
}

/**
 * Wraps a synchronous cleanup callback for `using`, preserving the disposal receiver.
 * Use `toAsyncDisposable` for callbacks that return a promise.
 * @category lib
 */
export function toDisposable(cleanup: Fn<[], void>): Disposable {
    return {[Symbol.dispose]: cleanup};
}

/**
 * Wraps a cleanup callback for `await using`, awaiting its result and preserving the disposal receiver.
 * @category lib
 */
export function toAsyncDisposable(cleanup: Fn<[], Promisify<void>>): AsyncDisposable {
    return {
        async [Symbol.asyncDispose]() {
            await cleanup.call(this);
        },
    };
}

/**
 * An object with disposal attached.
 * @category lib
 */
export type WithDisposable<T extends Rec> = T & Disposable;

/**
 * Attaches a disposer to an object, so it works with `using`.
 * @category lib
 */
export function withDisposable<T extends Rec>(target: T, disposer: Fn): WithDisposable<T> {
    return Object.assign(target, toDisposable(disposer));
}

/**
 * A promise that also disposes, for `using pending = ...`.
 * @category lib
 */
export type WithDisposablePending<T> = WithDisposable<Promise<Awaited<T>> & Disposable>;

/**
 * Wraps a value in a promise carrying a disposer, so awaiting and releasing share one object.
 * @category lib
 */
export function withDisposablePending<T>(value: T, disposer: Fn): WithDisposablePending<T> {
    return withDisposable(Promise.resolve(value), disposer);
}
