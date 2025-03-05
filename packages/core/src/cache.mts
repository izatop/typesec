import type {Arrayify, Fn, LikeString} from "@typesec/the";
import {isArray, isObject} from "radash";

export type CacheNamedKey = {name: string};
export type CacheKey = Arrayify<CacheNamedKey | LikeString>;
export const store = new Map();

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
