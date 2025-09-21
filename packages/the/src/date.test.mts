import {describe, expect, test} from "bun:test";
import {date, dateUtils} from "./date.mjs";

describe("Date Utils", async () => {
    test("now", () => {
        const date = dateUtils.now("+1s");
        expect(date).toBeInstanceOf(Date);
    });

    test("shift", () => {
        const date = new Date();
        const next = dateUtils.shift(date, "+1s");
        expect(date).not.toStrictEqual(next);
        expect(date.getTime() + 1000).toEqual(next.getTime());
    });

    test("apply", () => {
        const date = new Date();
        const next = dateUtils.apply(date, "+1s");
        expect(date).toStrictEqual(next);
    });

    test("format", () => {
        const d = new Date();
        const next = dateUtils.shift(d, dateUtils.format("+", 1, "m"));
        expect(d.getTime() + 60000).toEqual(next.getTime());
    });

    test("fromTimestamp/toTimestamp", () => {
        const d = new Date(1700000000000);
        const ts = dateUtils.toTimestamp(d);
        expect(ts).toBe(Math.floor(1700000000000 / 1000));
        const back = dateUtils.fromTimestamp(ts);
        expect(back.getTime()).toBe(ts * 1000);
    });

    test("isWith/assertWith", () => {
        expect(dateUtils.isWith("+10d")).toBeTrue();
        expect(dateUtils.isWith("10d")).toBeFalse();
        expect(() => dateUtils.assertWith("+2h")).not.toThrow();
        expect(() => dateUtils.assertWith("oops" as any)).toThrow();
    });

    test("valid/is Date checks", () => {
        const good = new Date();
        const bad = new Date("invalid");
        expect(date.is(good)).toBeTrue();
        expect(date.valid(good)).toBeTrue();
        expect(date.is(bad)).toBeTrue();
        expect(date.valid(bad)).toBeFalse();
        expect(date.valid("not a date" as any)).toBeFalse();
    });

    test("shift/apply should throw on invalid expr", () => {
        const d = new Date();
        expect(() => dateUtils.shift(d, "+1X" as any)).toThrow(RangeError);
        expect(() => dateUtils.apply(d, "-2Q" as any)).toThrow(RangeError);
    });

    test("shift: hours and days", () => {
        const d = new Date();
        const h = dateUtils.shift(d, "+1h");
        const day = dateUtils.shift(d, "+1d");
        expect(h.getTime() - d.getTime()).toBe(60 * 60 * 1000);
        expect(day.getTime() - d.getTime()).toBe(24 * 60 * 60 * 1000);
    });

    test("shift: months and years", () => {
        const d = new Date("2020-01-15T00:00:00.000Z");
        const m = dateUtils.shift(d, "+1M");
        const y = dateUtils.shift(d, "+1Y");
        const monthDelta = (m.getMonth() - d.getMonth() + 12) % 12;
        expect(monthDelta === 1 || monthDelta === 11).toBeTrue();
        expect(Math.abs(y.getFullYear() - d.getFullYear())).toBe(1);
    });
});
