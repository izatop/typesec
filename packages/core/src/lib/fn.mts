import {isInstance} from "@typesec/the";
import {AssertionError} from "node:assert";
import {partial} from "radash";

export function ensure<T>(store: Map<any, T> | WeakMap<WeakKey, T>, key: WeakKey, factory: () => T): T {
    const value = store.get(key) ?? factory();
    if (!store.has(key)) {
        store.set(key, value);
    }

    return value;
}

export type XMap<K, V, M extends Map<K, V>> = M & XMapEnsure<K, V>;
export type XWeakMap<K extends WeakKey, V, M extends WeakMap<K, V>> = M & XMapEnsure<K, V>;
export type XMapEnsure<K, V> = {ensure: <R>(key: K, factory: () => R) => V extends unknown ? R : V};

export function xmap<K, V>(map: Map<K, V>): XMap<K, V, Map<K, V>>;
export function xmap<K extends WeakKey, V, M extends WeakMap<K, V>>(map: M): XWeakMap<K, V, M>;
export function xmap(map: any): any {
    Reflect.defineProperty(map, "ensure", {value: partial(ensure, map)});

    return map;
}

export function isAsyncDisposable(res: unknown): res is AsyncDisposable {
    return isInstance(res) && Reflect.has(res, Symbol.asyncDispose);
}

export function isDisposable(res: unknown): res is Disposable {
    return isInstance(res) && Reflect.has(res, Symbol.dispose);
}

export function assert(value: unknown, message: string | Error): asserts value {
    if (value) {
        return;
    }

    throw new AssertionError({message: message instanceof Error ? message.message : message});
}
