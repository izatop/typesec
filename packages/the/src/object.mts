import {assert} from "./assert.mjs";
import {is} from "./fn.mjs";
import type {Drop, Entries, KeyOf, Override, Rec, RecKey} from "./type.mjs";

/**
 * Returns the key after asserting the record actually carries it.
 * @category object
 */
export function key<T extends Rec, K extends KeyOf<T, string>>(value: T, key: K): K {
    assert(has(value, key), `Unknown key ${key} in ${identify(value)}`);

    return key;
}

/**
 * Reads one property, typed by the key.
 * @category object
 */
export function prop<T extends Rec, K extends keyof T>(value: T, key: K): T[K] {
    return value[key];
}

/**
 * `Object.entries` that keeps the key and value types paired.
 * @category object
 */
export function toEntries<T extends Rec>(value: T): Entries<T>[] {
    return Object.entries(value);
}

/**
 * `Object.fromEntries` that keeps the key and value types.
 * @category object
 */
export function fromEntries<K extends PropertyKey, V>(value: [K, V][]): Rec<K, V> {
    return Object.fromEntries(value) as Rec<K, V>;
}

/**
 * Rebuilds the original record from entries produced by `toEntries`.
 * @category object
 */
export function reverseEntries<T>(value: Entries<T>[]): T {
    return Object.fromEntries(value) as T;
}

/**
 * Awaits the values of `[key, promise]` pairs and assembles the record.
 * @category object
 * @category async
 */
export async function fromAsyncEntries<K extends PropertyKey, V>(value: [K, Promise<V>][]): Promise<Rec<K, V>> {
    const entries = await Promise.all(value.map(([key, entry]) => entry.then((value) => [key, value])));

    return Object.fromEntries(entries) as Rec<K, V>;
}

/**
 * Merges two records into a new one, with `b` winning on shared keys.
 * @category object
 */
export function override<A extends Rec, B extends Rec>(a: A, b: B): Override<A, B> {
    return {...a, ...b} as unknown as Override<A, B>;
}

/**
 * Mutates `a` with the properties of `b`, which may only narrow existing keys.
 * @category object
 */
export function assign<A extends Rec, B extends Partial<A>>(a: A, b: B): void {
    Object.assign(a, b);
}

/**
 * Removes every property equal to the given value, in the type as well as at runtime.
 * @category object
 * @example drop(config, undefined)
 */
export function drop<A extends Rec, V>(a: A, dropValue: V): Drop<A, V> {
    return fromEntries(toEntries(a).filter(([, value]) => dropValue !== value)) as unknown as Drop<A, V>;
}

/**
 * A copy without the listed keys.
 * @category object
 */
export function omit<T extends Rec, K extends keyof T>(target: T, ...keys: K[]): Omit<T, K> {
    return reverseEntries(toEntries(target).filter(([key]) => !keys.some((k) => k === key)));
}

/**
 * A copy with only the listed keys.
 * @category object
 */
export function pick<T extends Rec, K extends keyof T>(target: T, ...keys: K[]): Pick<T, K> {
    return reverseEntries(toEntries(target).filter(([key]) => keys.some((k) => k === key)));
}

/**
 * Whether the value is exactly `null`.
 * @category guard
 */
export function isNull(value: unknown): value is null {
    return value === null;
}

/**
 * Whether the value is an object that is neither `null` nor an array.
 * @category guard
 */
export function isObject<T extends Rec>(value: unknown): value is T {
    return is(value, "object") && value !== null && !Array.isArray(value);
}

/**
 * Whether the record carries every listed key, narrowing it to include them.
 * @category guard
 */
export function has<T extends Rec, K extends string>(value: T, ...keys: K[]): value is T & Rec<K, unknown> {
    return keys.every((key) => Reflect.has(value, key));
}

/**
 * Whether the key belongs to the record, narrowing the key.
 * @category guard
 */
export function hasKeyOf<T extends Rec>(value: T, key: RecKey): key is KeyOf<T> {
    return Reflect.has(value, key);
}

/**
 * Whether every key belongs to the record, narrowing the list.
 * @category guard
 */
export function hasKeyListOf<T extends Rec>(value: T, keys: RecKey[]): keys is KeyOf<T>[] {
    return keys.every((key) => Reflect.has(value, key));
}

/**
 * Own keys of a record, optionally filtered to one key kind.
 * @category object
 * @example keys(config, "string")
 */
export function keys<T extends Rec>(value: T): KeyOf<T>[];
export function keys<T extends Rec>(value: T, type: "string"): KeyOf<T, string>[];
export function keys<T extends Rec>(value: T, type: "symbol"): KeyOf<T, symbol>[];
export function keys<T extends Rec>(value: T, type: "number"): KeyOf<T, symbol>[];
export function keys<T extends Rec, K extends RecKey>(value: T, type?: K): KeyOf<T, any>[] {
    const keys = Reflect.ownKeys(value);

    return type ? keys.filter((key) => is(key, type as any)) : keys;
}

const identifyKeys = ["id", "name"];

/**
 * Derives a readable name for a value, for logs and traces.
 *
 * Prefers an `id` or `name` property, falls back to the constructor name, and finally to `defaultValue`.
 * @category string
 */
export function identify(target: unknown, defaultValue = "anonymous"): string {
    if (object.is(target) || is(target, "function")) {
        const key = identifyKeys.find((key) => has(target, key) && is(target[key], "string"));

        return key ? identify(Reflect.get(target, key), defaultValue) : identify(target.constructor, defaultValue);
    }

    return is(target, "string") && target ? target : defaultValue;
}

/**
 * `Object.values` typed as the union of the record's value types.
 * @category object
 */
export function values<T extends Rec>(value: T): T[KeyOf<T>][] {
    return Object.values(value) as T[KeyOf<T>][];
}

/**
 * Whether the value is a plain object rather than a class instance.
 * @category guard
 */
function isPlain<T extends Rec>(value: unknown): value is T {
    if (!isObject(value)) {
        return false;
    }

    const proto = Object.getPrototypeOf(value);
    if (proto === null || proto === Object.prototype) {
        return true;
    }

    return proto.constructor === Object;
}

/**
 * Record helpers: typed entries, key guards, merging and naming.
 * @category object
 */
export const object = {
    key,
    prop,
    drop,
    assign,
    identify,
    toEntries,
    reverseEntries,
    fromEntries,
    fromAsyncEntries,
    override,
    isObject,
    isNull,
    has,
    hasKeyOf,
    hasKeyListOf,
    keys,
    values,
    is: isObject,
    isPlain,
    omit,
    pick,
};

export default object;
