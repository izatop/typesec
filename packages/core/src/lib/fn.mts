import {isInstance, type Fn} from "@typesec/the";
import {AssertionError} from "node:assert";

export type XMap<K, V, M extends Map<K, V>> = M & XMapEnsure<K, V>;
export type XWeakMap<K extends WeakKey, V, M extends WeakMap<K, V>> = M & XMapEnsure<K, V>;
export type XMapEnsure<K, V> = {ensure: (key: K, factory?: () => V) => V};

export function xmap<K, V>(map: Map<K, V>): XMap<K, V, Map<K, V>>;
export function xmap<K, V>(map: Map<K, V>, ensure: <K>(key: K) => V): XMap<K, V, Map<K, V>>;
export function xmap<K extends WeakKey, V, M extends WeakMap<K, V>>(map: M): XWeakMap<K, V, M>;
export function xmap(map: any, defaultEnsure?: Fn): any {
    Reflect.defineProperty(map, "ensure", {
        value: (key: any, ensure?: Fn) => {
            assert(ensure || defaultEnsure || map.has(key), "Reuire factory");
            const value = map.get(key) ?? ensure?.() ?? defaultEnsure?.();
            if (!map.has(key)) {
                map.set(key, value);
            }

            return value;
        },
    });

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

    console.trace(message);
    throw new AssertionError({
        message: message instanceof Error ? message.message : message,
        stackStartFn: assert,
    });
}
