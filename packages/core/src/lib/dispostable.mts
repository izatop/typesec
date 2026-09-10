import {isInstance} from "@typesec/the";
import type {Fn, Rec} from "@typesec/the/type";

/**
 * Whether the value implements `Symbol.asyncDispose`.
 * @category guard
 */
export function isAsyncDisposable(res: unknown): res is AsyncDisposable {
    return isInstance(res) && Reflect.has(res, Symbol.asyncDispose);
}

/**
 * Whether the value implements `Symbol.dispose`.
 * @category guard
 */
export function isDisposable(res: unknown): res is Disposable {
    return isInstance(res) && Reflect.has(res, Symbol.dispose);
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
    return Object.assign(target, {
        [Symbol.dispose]: disposer,
    });
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
    return Object.assign(Promise.resolve(value), {
        [Symbol.dispose]: disposer,
    });
}
