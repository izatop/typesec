import {fn} from "./fn.mjs";
import object from "./object.mjs";
import type {Fn, MaybeThenable} from "./type.mjs";

/**
 * Whether the value is a native `Promise`.
 * @category async
 */
function isPromise<R = unknown>(value: Promise<R> | R): value is Promise<R> {
    return value instanceof Promise;
}

/**
 * Whether the value is a foreign thenable: an object with a callable `then`.
 * @category async
 */
function isPromiseLike<R = unknown>(value: MaybeThenable<R>): value is PromiseLike<R> {
    return object.is(value) && object.has(value, "then") && fn.is(value.then, "function");
}

/**
 * Whether the value can be awaited, native promise or foreign thenable.
 *
 * This is the check that lets a pipeline stay synchronous until a stage actually returns something async.
 * @category async
 */
function isThenable<R = unknown>(value: MaybeThenable<R>): value is PromiseLike<R> {
    return isPromise(value) || isPromiseLike(value);
}

/**
 * Whether the value is a running async generator.
 * @category async
 */
function isAsyncGenerator<T>(obj: unknown): obj is AsyncGenerator<T> {
    return Object.prototype.toString.call(obj) === "[object AsyncGenerator]";
}

/**
 * Whether the value is an `async function`.
 * @category async
 */
function isAsyncFunction<T>(obj: unknown): obj is AsyncGenerator<T> {
    return Object.prototype.toString.call(obj) === "[object AsyncFunction]";
}

/**
 * Whether the function is an `async function*`, before it is called.
 * @category async
 */
function isAsyncGeneratorFunction<A extends any[], R>(
    fn: Fn<A, R | AsyncGenerator<R>>,
): fn is Fn<A, AsyncGenerator<R>> {
    const AsyncGeneratorFunction = async function* () {}.constructor;

    return fn instanceof AsyncGeneratorFunction;
}

/**
 * Guards for promises, thenables and async generators.
 * @category async
 */
export const async = {
    isPromise,
    isThenable,
    isPromiseLike,
    isAsyncFunction,
    isAsyncGenerator,
    isAsyncGeneratorFunction,
};
