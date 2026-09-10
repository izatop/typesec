import type {Arrayify, Fn, LikeString} from "@typesec/the";
import {isArray, isObject} from "radash";

/**
 * A cache key carried by an object's `name`.
 * @category cache
 */
export type CacheNamedKey = {name: string};
/**
 * A cache key: a string-like value, a named object, or an array of them joined by `/`.
 * @category cache
 */
export type CacheKey = Arrayify<CacheNamedKey | LikeString>;
/**
 * The process-wide backing store behind `persist`.
 * @category cache
 */
export const store = new Map();

/**
 * Returns the cached value for a key, computing and storing it on first use.
 *
 * The cache lives for the process and is never evicted, so use it for values that stay valid for a run.
 * @category cache
 * @example persist(["user", id], () => db.user(id))
 */
export async function persist<T>(key: CacheKey, ensure: Fn<[], Promise<T>>): Promise<T> {
    key = resolve(key);
    const value = store.get(key) ?? (await ensure());
    if (!store.has(key)) {
        store.set(key, value);
    }

    return value;
}

function resolve(key: CacheKey): string {
    if (isArray(key)) {
        return key.map(resolve).join("/");
    }

    if (isNamedKey(key)) {
        return key.name;
    }

    return key.toString();
}

function isNamedKey(key: CacheKey): key is CacheNamedKey {
    return isObject(key) && Reflect.has(key, "name");
}
