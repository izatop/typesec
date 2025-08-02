import {isInstance} from "@typesec/the";
import type {Fn, Rec} from "@typesec/the/type";

export function isAsyncDisposable(res: unknown): res is AsyncDisposable {
    return isInstance(res) && Reflect.has(res, Symbol.asyncDispose);
}

export function isDisposable(res: unknown): res is Disposable {
    return isInstance(res) && Reflect.has(res, Symbol.dispose);
}

export type WithDisposable<T extends Rec> = T & Disposable;

export function withDisposable<T extends Rec>(target: T, disposer: Fn): WithDisposable<T> {
    return Object.assign(target, {
        [Symbol.dispose]: disposer,
    });
}

export type WithDisposablePending<T> = WithDisposable<Promise<Awaited<T>> & Disposable>;

export function withDisposablePending<T>(value: T, disposer: Fn): WithDisposablePending<T> {
    return Object.assign(Promise.resolve(value), {
        [Symbol.dispose]: disposer,
    });
}
