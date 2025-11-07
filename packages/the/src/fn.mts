import type {Fn, Fnify, Nullable, Rec} from "./type.mjs";

export type TypeCheckcList = "function" | "string" | "boolean" | "number" | "bigint" | "object" | "symbol";

export function is(value: unknown, type: "symbol"): value is symbol;
export function is(value: unknown, type: "undefined"): value is undefined;
export function is<T extends Rec>(value: unknown, type: "object"): value is T | null;
export function is(value: unknown, type: "bigint"): value is bigint;
export function is(value: unknown, type: "number"): value is number;
export function is(value: unknown, type: "boolean"): value is boolean;
export function is(value: unknown, type: "string"): value is string;
export function is<T extends Fn<any[], any>>(value: unknown, type: "function"): value is T;
export function is<T extends TypeCheckcList>(value: unknown, type: T): boolean {
    return typeof value === type;
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

export function fnify<T>(value: Fnify<T>): Fn<[], T> {
    return is(value, "function") ? value : () => value;
}

export function defnify<R>(value: Fnify<R>): R {
    return is(value, "function") ? value() : value;
}

export function isNullable<T>(value: Nullable<T>): value is null | undefined {
    return value === null || is(value, "undefined");
}

export function invoke<T extends Fn<A, string> | string, A extends any[]>(target: T, ...args: A): string {
    return is(target, "function") ? target(...args) : target;
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

function toStringValue(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    if (typeof value === "bigint") {
        value = String(value).concat("n");
    }

    if (typeof value === "symbol") {
        value = value.toString();
    }

    if (value instanceof Date) {
        try {
            return value.toISOString();
        } catch {
            return value.toString();
        }
    }

    try {
        return JSON.stringify(value);
    } catch {
        return Object.prototype.toString.call(value);
    }
}

function arrow<F extends Fn<any[], any>>(name: string, fn: F): F {
    return {[name]: (...args: any[]) => fn(...args)}[name] as F;
}

export const fn = {
    is,
    once,
    when,
    fnify,
    arrow,
    defnify,
    invoke,
    isInstance,
    isNullable,
    toStringValue,
};
