import {is} from "./fn.mts";
import type {Drop, Entries, KeyOf, Override, Rec, RecKey} from "./type.mjs";

export function prop<T extends Rec, K extends keyof T>(value: T, key: K): T[K] {
    return value[key];
}

export function toEntries<T extends Rec>(value: T): Entries<T>[] {
    return Object.entries(value);
}

export function fromEntries<K extends PropertyKey, V>(value: [K, V][]): Rec<K, V> {
    return Object.fromEntries(value) as Rec<K, V>;
}

export async function fromAsyncEntries<K extends PropertyKey, V>(value: [K, Promise<V>][]): Promise<Rec<K, V>> {
    const entries = await Promise.all(value.map(([key, entry]) => entry.then((value) => [key, value])));

    return Object.fromEntries(entries) as Rec<K, V>;
}

export function override<A extends Rec, B extends Rec>(a: A, b: B): Override<A, B> {
    return {...a, ...b} as unknown as Override<A, B>;
}

export function drop<A extends Rec, V>(a: A, dropValue: V): Drop<A, V> {
    return fromEntries(toEntries(a).filter(([, value]) => dropValue !== value)) as unknown as Drop<A, V>;
}

export function isNull(value: unknown): value is null {
    return value === null;
}

export function isObject<T extends Rec>(value: unknown): value is T {
    return is(value, "object") && value !== null && !Array.isArray(value);
}

export function has<T extends Rec, K extends string>(value: T, ...keys: K[]): value is T & Rec<K, unknown> {
    return keys.every((key) => Object.hasOwn(value, key));
}

export function hasKeyOf<T extends Rec>(value: T, key: RecKey): key is KeyOf<T> {
    return Object.hasOwn(value, key);
}

export function hasKeyListOf<T extends Rec>(value: T, keys: RecKey[]): keys is KeyOf<T>[] {
    return keys.every((key) => Object.hasOwn(value, key));
}

export function keys<T extends Rec>(value: T): KeyOf<T>[];
export function keys<T extends Rec>(value: T, type: "string"): KeyOf<T, string>[];
export function keys<T extends Rec>(value: T, type: "symbol"): KeyOf<T, symbol>[];
export function keys<T extends Rec>(value: T, type: "number"): KeyOf<T, symbol>[];
export function keys<T extends Rec, K extends RecKey>(value: T, type?: K): KeyOf<T, any>[] {
    const keys = Reflect.ownKeys(value);

    return type ? keys.filter((key) => is(key, type as any)) : keys;
}

const identifyKeys = ["id", "name"];

export function identify(target: unknown, defaultValue = "anonymous"): string {
    if (object.is(target) || is(target, "function")) {
        const key = identifyKeys.find((key) => has(target, key) && is(target[key], "string"));

        return key ? identify(Reflect.get(target, key), defaultValue) : identify(target.constructor, defaultValue);
    }

    return is(target, "string") && target ? target : defaultValue;
}

export const object = {
    prop,
    drop,
    identify,
    toEntries,
    fromEntries,
    fromAsyncEntries,
    override,
    isObject,
    isNull,
    has,
    hasKeyOf,
    hasKeyListOf,
    keys,
    is: isObject,
};

export default object;
