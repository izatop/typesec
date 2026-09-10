import {assert} from "./assert.mjs";
import {fn} from "./fn.mjs";
import {numbers} from "./numbers.mjs";

/**
 * A TTL unit. Case matters: `m` is minutes, `M` is months.
 * @category time
 */
export type TTLUnit = "ms" | "s" | "m" | "h" | "D" | "W" | "M" | "Y";

/**
 * A TTL written as a number and a unit, such as `30m`.
 * @category time
 */
export type TTLString = `${number}${TTLUnit}`;
/**
 * A TTL expression, or a plain count of milliseconds.
 * @category time
 */
export type TTLValue = TTLString | number;

const MS = 1;
const SEC = MS * 1000;
const MIN = SEC * 60;
const HOUR = MIN * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = MONTH * 12;

/**
 * Converts a TTL expression to milliseconds, rejecting a value that is not a positive integer.
 * @category time
 */
function parseString(ttl: TTLString): number {
    const [, valueStr = "", unit = ""] = ttl.match(/^(-?\d+)(ms|[a-zA-Z]+)$/) ?? [];
    const value = parseInt(valueStr, 10);
    assert(numbers.isInt(value) && value > 0, "Wrong TTL value");

    switch (unit) {
        case "ms":
            return value * MS;
        case "s":
            return value * SEC;
        case "m":
            return value * MIN;
        case "h":
            return value * HOUR;
        case "D":
            return value * DAY;
        case "W":
            return value * WEEK;
        case "M":
            return value * MONTH;
        case "Y":
            return value * YEAR;
        default:
            throw new RangeError("Unsupported TTL range");
    }
}

/**
 * Converts a TTL to milliseconds, accepting either an expression such as `30m` or a raw count.
 * @category time
 * @example ttl.parse("2h") // 7200000
 */
function parse(ttl: TTLValue): number {
    if (fn.is(ttl, "string")) {
        return parseString(ttl);
    }

    return ttl;
}

/**
 * A TTL in whole seconds, rounded down.
 * @category time
 */
function toSeconds(ttl: TTLValue): number {
    if (fn.is(ttl, "string")) {
        return Math.floor(parseString(ttl) / SEC);
    }

    return Math.floor(ttl / SEC);
}

/**
 * A TTL in whole minutes, rounded down.
 * @category time
 */
function toMinutes(ttl: TTLValue): number {
    if (fn.is(ttl, "string")) {
        return Math.floor(parseString(ttl) / MIN);
    }

    return Math.floor(ttl / MIN);
}

/**
 * The moment a TTL starting now would expire.
 * @category time
 * @example ttl.toDate("15m")
 */
function toDate(ttl: TTLValue) {
    return new Date(Date.now() + parse(ttl));
}

/**
 * Writes a count of seconds as a TTL expression.
 * @category time
 */
function asSeconds(value: number): TTLValue {
    return `${value}s`;
}

/**
 * TTL parsing and conversion, over expressions such as `30m` or `7D`.
 * @category time
 */
export const ttl = {parse, toSeconds, toMinutes, parseString, toDate, asSeconds};
