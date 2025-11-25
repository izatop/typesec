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

export function reverseEntries<T>(value: Entries<T>[]): T {
    return Object.fromEntries(value) as T;
}

export async function fromAsyncEntries<K extends PropertyKey, V>(value: [K, Promise<V>][]): Promise<Rec<K, V>> {
    const entries = await Promise.all(value.map(([key, entry]) => entry.then((value) => [key, value])));

    return Object.fromEntries(entries) as Rec<K, V>;
}

export function override<A extends Rec, B extends Rec>(a: A, b: B): Override<A, B> {
    return {...a, ...b} as unknown as Override<A, B>;
}

export function assign<A extends Rec, B extends Partial<A>>(a: A, b: B): void {
    Object.assign(a, b);
}

export function drop<A extends Rec, V>(a: A, dropValue: V): Drop<A, V> {
    return fromEntries(toEntries(a).filter(([, value]) => dropValue !== value)) as unknown as Drop<A, V>;
}

export function omit<T extends Rec, K extends keyof T>(target: T, ...keys: K[]): Omit<T, K> {
    return reverseEntries(toEntries(target).filter(([key]) => !keys.some((k) => k === key)));
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

export function values<T extends Rec>(value: T): T[KeyOf<T>] {
    return Object.values(value) as T[KeyOf<T>];
}

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

export const object = {
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
};

export default object;
