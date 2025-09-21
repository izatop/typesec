import {fn} from "./fn.mts";

function is(value: unknown): value is number {
    return fn.is(value, "number") && !isNaN(value);
}

function isFinite(value: unknown): value is number {
    return is(value) && Number.isFinite(value);
}

function isUnsafe(value: unknown): value is number {
    return fn.is(value, "number");
}

function isInt(value: unknown): value is number {
    return Number.isSafeInteger(value);
}

function gt(value: unknown, n: number): value is number {
    return is(value) && value > n;
}

function gte(value: unknown, n: number): value is number {
    return gt(value, n - 1);
}

function lt(value: unknown, n: number): value is number {
    return is(value) && value < n;
}

function lte(value: unknown, n: number): value is number {
    return lt(value, n + 1);
}

export const numbers = {
    is,
    isFinite,
    isInt,
    isUnsafe,
    gt,
    gte,
    lt,
    lte,
};
