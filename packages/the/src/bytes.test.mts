import {describe, expect, test} from "bun:test";
import type {ByteUnit} from "./bytes.mts";
import {bytes} from "./bytes.mts";

describe("bytes", () => {
    test("size() returns expected values for each unit", () => {
        const cases: Array<[ByteUnit, number]> = [
            ["b", 2 ** 0],
            ["Kb", 2 ** 10],
            ["Mb", 2 ** 20],
            ["Gb", 2 ** 30],
            ["Tb", 2 ** 40],
            ["Pb", 2 ** 50],
        ];

        for (const [unit, expected] of cases) {
            expect(bytes.size(unit)).toBe(expected);
        }
    });

    test("size() applies the multiplier for amount", () => {
        expect(bytes.size("Kb", 5)).toBe(5 * 2 ** 10);
        expect(bytes.size("Mb", 0.5)).toBe(0.5 * 2 ** 20);
    });
});
