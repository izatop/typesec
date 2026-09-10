import type {Fn, Rec} from "@typesec/the";
import * as fn from "./fn.mjs";

/**
 * A unit in a date expression: seconds, minutes, hours, days, months, years.
 * @category date
 */
export type DatePart =
    | "s" // seconds
    | "m" // minutes
    | "h" // hours
    | "d" // days
    | "M" // months
    | "Y"; // years

/**
 * A signed shift such as `+30m` or `-1Y`.
 * @category date
 */
export type DateExpr = `+${number}${DatePart}` | `-${number}${DatePart}`;

const factor: Rec<DatePart, Fn<[value: number, date: Date], number>> = {
    s: (v) => v * 1000,
    m: (v) => v * 60 * 1000,
    h: (v) => v * 60 * 60 * 1000,
    d: (v) => v * 60 * 60 * 24 * 1000,
    M: (v, d) => new Date(d).setMonth(d.getMonth() + v) - d.getTime(),
    Y: (v, d) => new Date(d).setFullYear(d.getFullYear() + v) - d.getTime(),
};

const regex = /^([+-]\d+)([smhdMY])$/;
const isPart = (value: string): value is DatePart => "smhdMY".includes(value);

function exprToTime(date: Date, expr: DateExpr): number {
    const [, valueStr = "", part = ""] = expr.match(regex) ?? [];
    const value = parseInt(valueStr, 10);
    if (isNaN(value) || !isPart(part)) {
        throw new RangeError(`Wrong the date expression format: ${expr}`);
    }

    return factor[part](value, date);
}

/**
 * Returns a new date moved by the expression, leaving the original untouched.
 * @category date
 * @example date.shift(createdAt, "+30d")
 */
function shift(date: Date, expr: DateExpr): Date {
    const seconds = exprToTime(date, expr);
    const next = new Date(date);
    next.setTime(date.getTime() + seconds);

    return next;
}

/**
 * Moves a date in place by the expression and returns it.
 * @category date
 */
function apply(date: Date, expr: DateExpr): Date {
    const seconds = exprToTime(date, expr);
    date.setTime(date.getTime() + seconds);

    return date;
}

/**
 * The current time moved by the expression.
 * @category date
 * @example date.now("+15m")
 */
function now(expr: DateExpr) {
    return apply(new Date(), expr);
}

/**
 * Builds a date expression from its parts.
 * @category date
 */
function format(sign: "+" | "-", value: number, part: DatePart): DateExpr {
    return `${sign}${value}${part}`;
}

/**
 * A `Date` from a Unix timestamp in seconds.
 * @category date
 */
function fromTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000);
}

/**
 * A Unix timestamp in seconds, from a date or from milliseconds.
 * @category date
 */
function toTimestamp(date: Date | number = new Date()): number {
    if (fn.is(date, "number")) {
        date = new Date(date);
    }

    return Math.floor(date.getTime() / 1000);
}

/**
 * Whether the string is a well-formed date expression.
 * @category date
 */
function isWith(expr = ""): expr is DateExpr {
    return regex.test(expr);
}

/**
 * Throws unless the value is a well-formed date expression.
 * @category date
 */
function assertWith(expr: unknown): asserts expr {
    if (fn.is(expr, "string") && isWith(expr)) {
        return;
    }

    throw new Error(`Unknown expression "${expr}"`);
}

/**
 * Whether the value is a `Date` that holds a real point in time.
 * @category date
 */
function valid(date: Date | unknown): date is Date {
    return is(date) && date.toString() !== "Invalid Date";
}

/**
 * Whether the value is a `Date`, valid or not.
 * @category date
 */
function is(value: unknown): value is Date {
    return value instanceof Date;
}

/**
 * Date arithmetic driven by signed expressions such as `+30m`.
 * @category date
 */
export const date = {
    is,
    valid,
    now,
    shift,
    apply,
    format,
    fromTimestamp,
    toTimestamp,
    isWith,
    assertWith,
};

/**
 * Former name of `date`.
 * @category date
 * @deprecated use `date`
 */
export const dateUtils = date;
