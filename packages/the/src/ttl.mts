import {assert} from "./assert.mts";
import {fn} from "./fn.mts";
import {numbers} from "./numbers.mts";

export type TTLUnit = "ms" | "s" | "m" | "h" | "D" | "W" | "M" | "Y";

export type TTLString = `${number}${TTLUnit}`;
export type TTLValue = TTLString | number;

const MS = 1;
const SEC = MS * 1000;
const MIN = SEC * 60;
const HOUR = MIN * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = MONTH * 12;

function parseString(ttl: TTLString): number {
    const value = parseInt(ttl.substring(0, ttl.length - 1), 10);
    const unit = ttl.substring(ttl.length - 1, ttl.length) as TTLUnit;
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
 *
 * @param ttl {TTLValue} TTL expression or milliseconds
 * @returns number milliseconds
 */
function parse(ttl: TTLValue): number {
    if (fn.is(ttl, "string")) {
        return parseString(ttl);
    }

    return ttl;
}

function toSeconds(ttl: TTLValue): number {
    if (fn.is(ttl, "string")) {
        return Math.floor(parseString(ttl) / SEC);
    }

    return Math.floor(ttl / SEC);
}

export const ttl = {parse, toSeconds, parseString};
