import type {KeyOf, Rec} from "@typesec/the";

function prop<T extends Rec, K extends keyof T>(value: T, key: K): T[K] {
    return value[key];
}

function keys<T extends Rec>(value: T): (keyof T)[] {
    return Object.keys(value);
}

function keysOf<T extends Rec, F extends string | number | symbol>(
    value: T,
    filter: (v: string | number | symbol) => v is KeyOf<T, F>,
): KeyOf<T, F>[] {
    return keys(value).filter(filter);
}

export const object = {
    prop,
    keys,
    keysOf,
};
