import type {Fn, Fnify, Rec} from "./interfaces.mjs";

export function isFunction<T extends Fn>(value: unknown): value is T {
    return typeof value === "function";
}

export function isInstance<T extends Rec>(value: unknown): value is T {
    return typeof value === "object" && value !== null;
}

export function when<T, R1>(value: T, then: Fn<[T], R1>): R1 | void;
export function when<T, R1, R2>(value: T, then: Fn<[T], R1>, fallback: Fnify<R2>): R1 | R2;
export function when<T, R1, R2>(value: T, then: Fn<[T], R1>, fallback?: Fnify<R2>): R1 | R2 | void {
    return value ? then(value) : isFunction(fallback) ? fallback() : fallback;
}

export function fnfy<R>(value: Fnify<R>): R {
    return isFunction(value) ? value() : value;
}
