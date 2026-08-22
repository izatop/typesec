import {fn} from "./fn.mts";
import object from "./object.mts";
import type {Fn, MaybeThenable} from "./type.mjs";

function isPromise<R = unknown>(value: Promise<R> | R): value is Promise<R> {
    return value instanceof Promise;
}

function isPromiseLike<R = unknown>(value: MaybeThenable<R>): value is PromiseLike<R> {
    return object.is(value) && object.has(value, "then") && fn.is(value.then, "function");
}

function isThenable<R = unknown>(value: MaybeThenable<R>): value is PromiseLike<R> {
    return isPromise(value) || isPromiseLike(value);
}

function isAsyncGenerator<T>(obj: unknown): obj is AsyncGenerator<T> {
    return Object.prototype.toString.call(obj) === "[object AsyncGenerator]";
}

function isAsyncFunction<T>(obj: unknown): obj is AsyncGenerator<T> {
    return Object.prototype.toString.call(obj) === "[object AsyncFunction]";
}

function isAsyncGeneratorFunction<A extends any[], R>(
    fn: Fn<A, R | AsyncGenerator<R>>,
): fn is Fn<A, AsyncGenerator<R>> {
    const AsyncGeneratorFunction = async function* () {}.constructor;

    return fn instanceof AsyncGeneratorFunction;
}

export const async = {
    isPromise,
    isThenable,
    isPromiseLike,
    isAsyncFunction,
    isAsyncGenerator,
    isAsyncGeneratorFunction,
};
