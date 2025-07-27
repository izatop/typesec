import type {Fn, Rec} from "@typesec/the";
import {isString} from "radash";

export type DatePart =
    | "s" // seconds
    | "m" // minutes
    | "h" // hours
    | "d" // days
    | "M" // months
    | "Y"; // years

export type DateExpr = `+${number}${DatePart}` | `-${number}${DatePart}`;

const factor: Rec<DatePart, Fn<[value: number, date: Date], number>> = {
    s: (v) => v * 1000,
    m: (v) => v * 60 * 1000,
    h: (v) => v * 60 * 60 * 1000,
    d: (v) => v * 60 * 60 * 24 * 1000,
    M: (v, d) => d.getTime() - new Date(d).setMonth(d.getMonth() + v),
    Y: (v, d) => d.getTime() - new Date(d).setFullYear(d.getFullYear() + v),
};

const regex = /^([+-]\d+)([smhdMY])$/;
const isPart = (value: string): value is DatePart => "smhdMY".includes(value);

function exprToTime(date: Date, expr: DateExpr): number {
    const [, valueStr, part] = expr.match(regex) ?? [];
    const value = parseInt(valueStr, 10);
    if (isNaN(value) || !isPart(part)) {
        throw new RangeError(`Wrong the date expression format: ${expr}`);
    }

    return factor[part](value, date);
}

function shift(date: Date, expr: DateExpr): Date {
    const seconds = exprToTime(date, expr);
    const next = new Date(date);
    next.setTime(date.getTime() + seconds);

    return next;
}

function apply(date: Date, expr: DateExpr): Date {
    const seconds = exprToTime(date, expr);
    date.setTime(date.getTime() + seconds);

    return date;
}

function now(expr: DateExpr) {
    return apply(new Date(), expr);
}

function format(sign: "+" | "-", value: number, part: DatePart): DateExpr {
    return `${sign}${value}${part}`;
}

function fromTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000);
}

function toTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

function isWith(expr = ""): expr is DateExpr {
    return regex.test(expr);
}

function assertWith(expr: unknown): asserts expr {
    if (isString(expr) && isWith(expr)) {
        return;
    }

    throw new Error(`Unknown expression "${expr}"`);
}

export const dateUtils = {
    now,
    shift,
    apply,
    format,
    fromTimestamp,
    toTimestamp,
    isWith,
    assertWith,
};
