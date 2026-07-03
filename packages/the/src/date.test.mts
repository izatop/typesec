import {describe, expect, test} from "bun:test";
import {date} from "./date.mjs";

describe("Date Utils", async () => {
    test("now", () => {
        const d = date.now("+1s");
        expect(d).toBeInstanceOf(Date);
    });

    test("shift", () => {
        const d = new Date();
        const next = date.shift(d, "+1s");
        expect(d).not.toStrictEqual(next);
        expect(d.getTime() + 1000).toEqual(next.getTime());
    });

    test("apply", () => {
        const d = new Date();
        const next = date.apply(d, "+1s");
        expect(d).toStrictEqual(next);
    });

    test("format", () => {
        const d = new Date();
        const next = date.shift(d, date.format("+", 1, "m"));
        expect(d.getTime() + 60000).toEqual(next.getTime());
    });

    test("fromTimestamp/toTimestamp", () => {
        const d = new Date(1700000000000);
        const ts = date.toTimestamp(d);
        expect(ts).toBe(Math.floor(1700000000000 / 1000));
        const back = date.fromTimestamp(ts);
        expect(back.getTime()).toBe(ts * 1000);
    });

    test("isWith/assertWith", () => {
        expect(date.isWith("+10d")).toBeTrue();
        expect(date.isWith("10d")).toBeFalse();
        expect(() => date.assertWith("+2h")).not.toThrow();
        expect(() => date.assertWith("oops" as any)).toThrow();
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
        expect(() => date.shift(d, "+1X" as any)).toThrow(RangeError);
        expect(() => date.apply(d, "-2Q" as any)).toThrow(RangeError);
    });

    test("shift: hours and days", () => {
        const d = new Date();
        const h = date.shift(d, "+1h");
        const day = date.shift(d, "+1d");
        expect(h.getTime() - d.getTime()).toBe(60 * 60 * 1000);
        expect(day.getTime() - d.getTime()).toBe(24 * 60 * 60 * 1000);
    });

    test("shift: months and years", () => {
        const d = new Date("2020-01-15T00:00:00.000Z");
        const m = date.shift(d, "+1M");
        const y = date.shift(d, "+1Y");
        expect(m.toISOString()).toBe("2020-02-15T00:00:00.000Z");
        expect(y.toISOString()).toBe("2021-01-15T00:00:00.000Z");
    });

    test("shift: negative months and years", () => {
        const d = new Date("2020-03-15T00:00:00.000Z");
        const m = date.shift(d, "-1M");
        const y = date.shift(d, "-1Y");
        expect(m.toISOString()).toBe("2020-02-15T00:00:00.000Z");
        expect(y.toISOString()).toBe("2019-03-15T00:00:00.000Z");
    });

    test("toTimestamp(number) treats number as milliseconds", () => {
        expect(date.toTimestamp(1700000000000)).toBe(1700000000);
    });
});
