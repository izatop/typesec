import {fn} from "./fn.mjs";

/**
 * Whether the value is a number, excluding `NaN`.
 *
 * `Infinity` passes: this is the low-level check. Use `isFinite` when infinities are not acceptable.
 * @category number
 */
function is(value: unknown): value is number {
    return fn.is(value, "number") && !isNaN(value);
}

/**
 * Whether the value is a number that is neither `NaN` nor an infinity.
 * @category number
 */
function isFinite(value: unknown): value is number {
    return is(value) && Number.isFinite(value);
}

/**
 * Whether `typeof value` is `number`, `NaN` included.
 * @category number
 */
function isUnsafe(value: unknown): value is number {
    return fn.is(value, "number");
}

/**
 * Whether the value is a safe integer.
 * @category number
 */
function isInt(value: unknown): value is number {
    return Number.isSafeInteger(value);
}

/**
 * Whether the value is a number greater than `n`.
 * @category number
 */
function gt(value: unknown, n: number): value is number {
    return is(value) && value > n;
}

/**
 * Whether the value is a number greater than or equal to `n`.
 * @category number
 */
function gte(value: unknown, n: number): value is number {
    return is(value) && value >= n;
}

/**
 * Whether the value is a number less than `n`.
 * @category number
 */
function lt(value: unknown, n: number): value is number {
    return is(value) && value < n;
}

/**
 * Whether the value is a number less than or equal to `n`.
 * @category number
 */
function lte(value: unknown, n: number): value is number {
    return is(value) && value <= n;
}

/**
 * Coerces a string or number to a finite number, falling back when it cannot.
 * @category number
 * @example numbers.toFinite(process.env.PORT, 3000)
 */
function toFinite(value: unknown, fallback: number): number {
    const parsed = fn.is(value, "string") || is(value) ? +value : fallback;

    return isFinite(parsed) ? parsed : fallback;
}

/**
 * A random integer in `[min, max]`, both ends included.
 * @category number
 */
function random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Number guards, comparisons and coercion.
 * @category number
 */
export const numbers = {
    is,
    isFinite,
    toFinite,
    isInt,
    isUnsafe,
    gt,
    gte,
    lt,
    lte,
    random,
};
