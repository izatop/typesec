import type {Entries, Rec} from "./interfaces.mjs";

export function toEntries<T extends Rec>(value: T): Entries<T> {
    return Object.entries(value);
}

export function fromEntries<T extends Rec>(value: Entries<T>): T {
    return Object.fromEntries(value) as T;
}
