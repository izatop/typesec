import type {Entries, Override, Rec} from "./interfaces.mjs";

export function toEntries<T extends Rec>(value: T): Entries<T> {
    return Object.entries(value);
}

export function fromEntries<T extends Rec>(value: Entries<T>): T {
    return Object.fromEntries(value) as T;
}

export function override<A extends Rec, B extends Rec>(a: A, b: B): Override<A, B> {
    return {...a, ...b} as unknown as Override<A, B>;
}
