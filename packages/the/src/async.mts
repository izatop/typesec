import type {Fn} from "./type.mts";

function isPromise<R>(value: unknown): value is Promise<R> {
    return value instanceof Promise;
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
    isAsyncFunction,
    isAsyncGenerator,
    isAsyncGeneratorFunction,
};
