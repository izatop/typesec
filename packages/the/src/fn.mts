import type {Fn, Fnify, Nullable, Rec} from "./type.mjs";

export type TypeCheckcList = "function" | "string" | "boolean" | "number" | "bigint" | "object" | "symbol";

export function is(value: unknown, type: "symbol"): value is symbol;
export function is(value: unknown, type: "undefined"): value is undefined;
export function is<T extends Rec>(value: unknown, type: "object"): value is T | null;
export function is(value: unknown, type: "bigint"): value is bigint;
export function is(value: unknown, type: "number"): value is number;
export function is(value: unknown, type: "boolean"): value is boolean;
export function is(value: unknown, type: "string"): value is string;
export function is<T extends Fn>(value: unknown, type: "function"): value is T;
export function is<T extends TypeCheckcList>(value: unknown, type: T): boolean {
    return typeof value === type;
}

/**
 *
 * @deprecated use is(value, type)
 * @param value {unknown}
 * @returns boolean
 */
export function isFunction<T extends Fn>(value: unknown): value is T {
    return typeof value === "function";
}

export function isInstance<T extends Rec>(value: unknown): value is T {
    return typeof value === "object" && value !== null;
}

export function when<T, R1>(value: T, then: Fn<[NonNullable<T>], R1> | R1): R1 | undefined;
export function when<T, R1, R2>(value: T, then: Fn<[NonNullable<T>], R1> | R1, fallback: Fnify<R2>): R1 | R2;
export function when<T, R1, R2>(
    value: T,
    then: Fn<[NonNullable<T>], R1> | R1,
    fallback?: Fnify<R2>,
): R1 | R2 | undefined {
    return value ? (is(then, "function") ? then(value) : then) : is(fallback, "function") ? fallback() : fallback;
}

export function fnify<R>(value: Fnify<R>): Fnify<R> {
    return is(value, "function") ? value : () => value;
}

export function defnify<R>(value: Fnify<R>): R {
    return is(value, "function") ? value() : value;
}

export function isNullable<T>(value: Nullable<T>): value is null | undefined {
    return value === null || is(value, "undefined");
}

const onceRef = new WeakMap<Fn<[], any>, any>();

function once<R>(fn: Fn<[], R>): Fn<[], R> {
    return (): R => {
        const res = onceRef.get(fn) ?? fn();
        if (!onceRef.has(fn)) {
            onceRef.set(fn, res);
        }

        return res;
    };
}

export const fn = {
    once,
};
