import {describe, expect, test} from "bun:test";
import {dateUtils} from "../../src/date.mjs";

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
        const date = new Date();
        const next = dateUtils.shift(date, dateUtils.format("+", 1, "m"));
        expect(date.getTime() + 60000).toEqual(next.getTime());
    });
});
