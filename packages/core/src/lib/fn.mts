import {isInstance, type Fn} from "@typesec/the";
import {AssertionError} from "node:assert";

export type XMap<K, V, M, W extends boolean> = M & XMapEnsure<K, V, W>;
export type XMapEnsure<K, V, W extends boolean> = W extends true
    ? {ensure: (key: K, factory: () => V) => V}
    : {ensure: (key: K, factory?: () => V) => V};

export function xmap<K, V>(map: Map<K, V>): XMap<K, V, Map<K, V>, true>;
export function xmap<K, V>(map: Map<K, V>, ensure: <K>(key: K) => V): XMap<K, V, Map<K, V>, false>;
export function xmap<K extends WeakKey, V>(map: WeakMap<K, V>): XMap<K, V, WeakMap<K, V>, true>;
export function xmap<K extends WeakKey, V>(
    map: WeakMap<K, V>,
    ensure: <K>(key: K) => V,
): XMap<K, V, WeakMap<K, V>, false>;
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
