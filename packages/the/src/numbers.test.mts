import {describe, expect, test} from "bun:test";
import {numbers} from "./numbers.mts";

describe("numbers", () => {
    test("is(number)", () => {
        expect(numbers.is(1)).toBeTrue();
        expect(numbers.is(0)).toBeTrue();
        expect(numbers.is(-1)).toBeTrue();
        expect(numbers.is(Infinity)).toBeTrue();
        expect(numbers.is(NaN)).toBeFalse();
    });

    test("isDouble(number)", () => {
        expect(numbers.isFinite(1)).toBeTrue();
        expect(numbers.isFinite(0)).toBeTrue();
        expect(numbers.isFinite(-1)).toBeTrue();
        expect(numbers.isFinite(Infinity)).toBeFalse();
        expect(numbers.isFinite(NaN)).toBeFalse();
    });

    test("isInt(number)", () => {
        expect(numbers.isInt(1)).toBeTrue();
        expect(numbers.isInt(1.1)).toBeFalse();
    });

    test("gt(number, than)", () => {
        expect(numbers.gt(1, 0)).toBeTrue();
        expect(numbers.gt(1, 1)).toBeFalse();
        expect(numbers.gt(0, 1)).toBeFalse();
    });

    test("gte(number, than)", () => {
        expect(numbers.gte(1, 0)).toBeTrue();
        expect(numbers.gte(1, 1)).toBeTrue();
    });

    test("lt(number, than)", () => {
        expect(numbers.lt(0, 1)).toBeTrue();
        expect(numbers.lt(1, 1)).toBeFalse();
        expect(numbers.lt(1, 0)).toBeFalse();
    });

    test("lte(number, than)", () => {
        expect(numbers.lte(0, 0)).toBeTrue();
        expect(numbers.lte(1, 1)).toBeTrue();
    });
});
