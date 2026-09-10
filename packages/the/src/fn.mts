import type {Constructor, Fn, Fnify, Nullable, Nullish, Rec} from "./type.mjs";

/**
 * The `typeof` results `is` accepts.
 * @category guard
 */
export type TypeCheckList = "function" | "string" | "boolean" | "number" | "bigint" | "object" | "symbol";

/**
 * The `typeof` results `is` accepts.
 * @category guard
 * @deprecated misspelled, use `TypeCheckList`
 */
export type TypeCheckcList = TypeCheckList;

/**
 * A typed `typeof` check that narrows the value.
 *
 * Each overload maps one `typeof` result to the type it proves, so `is(v, "string")` narrows to `string` rather than to `boolean`.
 * @category guard
 * @example if (is(value, "function")) value();
 */
export function is(value: unknown, type: "symbol"): value is symbol;
export function is(value: unknown, type: "undefined"): value is undefined;
export function is<T extends Rec>(value: unknown, type: "object"): value is T | null;
export function is(value: unknown, type: "bigint"): value is bigint;
export function is(value: unknown, type: "number"): value is number;
export function is(value: unknown, type: "boolean"): value is boolean;
export function is(value: unknown, type: "string"): value is string;
export function is<T extends Fn<any[], any>>(value: unknown, type: "function"): value is T;
export function is<T extends TypeCheckList>(value: unknown, type: T): boolean {
    return typeof value === type;
}

/**
 * Whether the value is truthy, narrowing away `null` and `undefined`.
 * @category guard
 */
export function truify<T>(value: T): value is NonNullable<T> {
    return Boolean(value);
}

/**
 * Whether the value is a non-null object.
 * @category guard
 */
export function isInstance<T extends Rec>(value: unknown): value is T {
    return typeof value === "object" && value !== null;
}

/**
 * Applies `then` when the value is truthy, otherwise falls back.
 *
 * Both branches accept a value or a function producing one.
 * @category control
 * @example when(user, (u) => u.name, "anonymous")
 */
export function when<T, R1>(value: T, then: Fn<[NonNullable<T>], R1> | R1): R1 | undefined;
export function when<T, R1, R2>(value: T, then: Fn<[NonNullable<T>], R1> | R1, fallback: Fnify<R2>): R1 | R2;
export function when<T, R1, R2>(
    value: T,
    then: Fn<[NonNullable<T>], R1> | R1,
    fallback?: Fnify<R2>,
): R1 | R2 | undefined {
    return value ? (is(then, "function") ? then(value) : then) : is(fallback, "function") ? fallback() : fallback;
}

/**
 * Wraps a value in a thunk, and leaves a function as it is.
 * @category control
 */
export function fnify<T>(value: Fnify<T>): Fn<[], T> {
    return is(value, "function") ? value : () => value;
}

/**
 * Calls a thunk, and returns a plain value unchanged.
 * @category control
 */
export function defnify<R>(value: Fnify<R>): R {
    return is(value, "function") ? value() : value;
}

/**
 * Whether the value is exactly `null`.
 * @category guard
 */
export function isNullable<T>(value: Nullable<T>): value is null {
    return value === null;
}

/**
 * Whether the value is `null` or `undefined`.
 * @category guard
 */
export function isNullish<T>(value: Nullish<T>): value is null | undefined {
    return value === null || value === undefined;
}

/**
 * Calls the target when it is a function, and returns it unchanged otherwise.
 * @category control
 */
export function invoke<T, A extends any[]>(target: Fn<A, T>, ...args: A): T;
export function invoke<T>(target: T, ...args: any[]): T;
export function invoke(target: any, ...args: any[]): any {
    return is(target, "function") ? target(...args) : target;
}

const onceRef = new WeakMap<Fn<[], any>, any>();

/**
 * Memoises a thunk, so the wrapped function runs at most once per input function.
 * @category control
 */
function once<R>(fn: Fn<[], R>): Fn<[], R> {
    return (): R => {
        const res = onceRef.get(fn) ?? fn();
        if (!onceRef.has(fn)) {
            onceRef.set(fn, res);
        }

        return res;
    };
}

/**
 * Renders any value as a string for logs and messages.
 *
 * Handles `null`, `undefined`, `bigint`, `symbol` and `Date`, and falls back to `Object.prototype.toString` when JSON serialisation fails.
 * @category string
 */
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

/**
 * Wraps a function so that `fn.name` reads as the given name, which is what tracing reports.
 * @category control
 * @example main(fn.arrow("cli", () => runApplication(path)))
 */
function arrow<F extends Fn<any[], any>>(name: string, fn: F): F {
    return {[name]: (...args: any[]) => fn(...args)}[name] as F;
}

/**
 * Anything `named` can rename: a function or a class.
 * @category type
 */
export type NamedObject = Fn<any[], any> | {new (): unknown};

/**
 * Gives a function or a class a new `name`, keeping its behaviour.
 * @category control
 */
function named<T extends NamedObject>(name: string, target: T): T {
    const isClass = is(target, "function") && Function.prototype.toString.call(target).startsWith("class ");

    return is(target, "function") && !isClass
        ? arrow(name, target)
        : ({[name]: class extends (target as any) {}}[name] as T);
}

/**
 * Instantiates a class, or the class behind an instance.
 * @category control
 */
function construct<T extends {constructor: Function} | Function, A extends any[]>(target: T, ...args: A): T {
    const ctor = (is(target, "function") ? target : target.constructor) as Constructor<T>;

    return new ctor(...args);
}

/**
 * Composes two unary functions left to right.
 * @category control
 */
function combine<V1, V2, R>(fn1: Fn<[V1], V2>, fn2: Fn<[V2], R>): Fn<[V1], R> {
    return (v1: V1) => fn2(fn1(v1));
}

/**
 * Whether calling the thunk throws.
 * @category guard
 */
function isThrow(fn: Fn<[], unknown>): boolean {
    try {
        fn();

        return false;
    } catch {
        return true;
    }
}

/**
 * Whether calling the thunk returns without throwing.
 * @category guard
 */
function isNotThrow(fn: Fn<[], unknown>): boolean {
    return !isThrow(fn);
}

/**
 * Function and value helpers: type checks, thunks, naming, composition.
 * @category control
 */
export const fn = {
    is,
    once,
    when,
    fnify,
    arrow,
    named,
    defnify,
    invoke,
    isInstance,
    isNullable,
    isNullish,
    isThrow,
    isNotThrow,
    toStringValue,
    construct,
    truify,
    combine,
};
