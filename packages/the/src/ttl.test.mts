import {describe, expect, test} from "bun:test";
import {ttl, type TTLString} from "./ttl.mjs";

describe("ttl", () => {
    test("parseString(ttl) should parse every supported unit to milliseconds", () => {
        const cases: Array<[TTLString, number]> = [
            ["1ms", 1],
            ["2s", 2_000],
            ["3m", 180_000],
            ["4h", 14_400_000],
            ["5D", 432_000_000],
            ["6W", 3_628_800_000],
            ["7M", 18_144_000_000],
            ["8Y", 248_832_000_000],
        ];

        for (const [input, expected] of cases) {
            expect(ttl.parseString(input)).toBe(expected);
        }
    });

    test("parse(ttl) should pass through numeric milliseconds", () => {
        expect(ttl.parse(123)).toBe(123);
        expect(ttl.parse("2s")).toBe(2_000);
    });

    test("toSeconds(ttl) should floor milliseconds to seconds", () => {
        expect(ttl.toSeconds(1_999)).toBe(1);
        expect(ttl.toSeconds("2s")).toBe(2);
        expect(ttl.toSeconds("1500ms")).toBe(1);
    });

    test("toMinutes(ttl) should floor milliseconds to minutes", () => {
        expect(ttl.toMinutes(119_999)).toBe(1);
        expect(ttl.toMinutes("1h")).toBe(60);
        expect(ttl.toMinutes("90s")).toBe(1);
    });

    test("parseString(ttl) should reject unsupported ranges and invalid values", () => {
        expect(() => ttl.parseString("1x" as TTLString)).toThrow(RangeError);
        expect(() => ttl.parseString("0s" as TTLString)).toThrow("Wrong TTL value");
        expect(() => ttl.parseString("-1s" as TTLString)).toThrow("Wrong TTL value");
        expect(() => ttl.parseString("1.5s" as TTLString)).toThrow("Wrong TTL value");
    });
});
