import {describe, expect, test} from "bun:test";
import {numbers} from "./numbers.mjs";

describe("numbers", () => {
    test("is(number)", () => {
        expect(numbers.is(1)).toBeTrue();
        expect(numbers.is(0)).toBeTrue();
        expect(numbers.is(-1)).toBeTrue();
        expect(numbers.is(1.5)).toBeTrue();
        expect(numbers.is(Infinity)).toBeTrue();
        expect(numbers.is(-Infinity)).toBeTrue();
        expect(numbers.is(NaN)).toBeFalse();
        expect(numbers.is("1")).toBeFalse();
        expect(numbers.is(null)).toBeFalse();
        expect(numbers.is(undefined)).toBeFalse();
        expect(numbers.is(true)).toBeFalse();
    });

    test("isUnsafe(number) accepts any number type including NaN", () => {
        expect(numbers.isUnsafe(NaN)).toBeTrue();
        expect(numbers.isUnsafe(1)).toBeTrue();
        expect(numbers.isUnsafe(Infinity)).toBeTrue();
        expect(numbers.isUnsafe("1")).toBeFalse();
        expect(numbers.isUnsafe(null)).toBeFalse();
    });

    test("isFinite(number)", () => {
        expect(numbers.isFinite(1)).toBeTrue();
        expect(numbers.isFinite(Math.random())).toBeTrue();
        expect(numbers.isFinite(0)).toBeTrue();
        expect(numbers.isFinite(-1)).toBeTrue();
        expect(numbers.isFinite(Infinity)).toBeFalse();
        expect(numbers.isFinite(-Infinity)).toBeFalse();
        expect(numbers.isFinite(NaN)).toBeFalse();
        expect(numbers.isFinite("1")).toBeFalse();
    });

    test("isInt(number) requires a safe integer", () => {
        expect(numbers.isInt(1)).toBeTrue();
        expect(numbers.isInt(0)).toBeTrue();
        expect(numbers.isInt(-5)).toBeTrue();
        expect(numbers.isInt(1.1)).toBeFalse();
        expect(numbers.isInt(NaN)).toBeFalse();
        expect(numbers.isInt(Infinity)).toBeFalse();
        // beyond Number.MAX_SAFE_INTEGER: this is why isInt uses isSafeInteger, not isInteger
        expect(numbers.isInt(Number.MAX_SAFE_INTEGER)).toBeTrue();
        expect(numbers.isInt(Number.MAX_SAFE_INTEGER + 1)).toBeFalse();
        expect(numbers.isInt(2 ** 53)).toBeFalse();
        expect(numbers.isInt("1")).toBeFalse();
    });

    test("gt(number, than)", () => {
        expect(numbers.gt(1, 0)).toBeTrue();
        expect(numbers.gt(1, 1)).toBeFalse();
        expect(numbers.gt(0, 1)).toBeFalse();
        expect(numbers.gt(NaN, 0)).toBeFalse();
        expect(numbers.gt("1", 0)).toBeFalse();
    });

    test("gte(number, than)", () => {
        expect(numbers.gte(1, 0)).toBeTrue();
        expect(numbers.gte(1, 1)).toBeTrue();
        expect(numbers.gte(0, 1)).toBeFalse();
        // fractional values: must not use the integer (n-1) shortcut
        expect(numbers.gte(0.5, 1)).toBeFalse();
        expect(numbers.gte(1, 0.5)).toBeTrue();
        expect(numbers.gte(NaN, 0)).toBeFalse();
    });

    test("lt(number, than)", () => {
        expect(numbers.lt(0, 1)).toBeTrue();
        expect(numbers.lt(1, 1)).toBeFalse();
        expect(numbers.lt(1, 0)).toBeFalse();
        expect(numbers.lt(NaN, 1)).toBeFalse();
    });

    test("lte(number, than)", () => {
        expect(numbers.lte(0, 0)).toBeTrue();
        expect(numbers.lte(1, 1)).toBeTrue();
        expect(numbers.lte(2, 1)).toBeFalse();
        // fractional values: must not use the integer (n+1) shortcut
        expect(numbers.lte(1.5, 1)).toBeFalse();
        expect(numbers.lte(0.5, 1)).toBeTrue();
        expect(numbers.lte(NaN, 1)).toBeFalse();
    });

    test("toFinite(value, fallback)", () => {
        expect(numbers.toFinite(5, 0)).toBe(5);
        expect(numbers.toFinite("5", 0)).toBe(5);
        expect(numbers.toFinite("5.5", 0)).toBe(5.5);
        expect(numbers.toFinite("abc", 7)).toBe(7);
        expect(numbers.toFinite(NaN, 7)).toBe(7);
        expect(numbers.toFinite(Infinity, 7)).toBe(7);
        expect(numbers.toFinite(null, 7)).toBe(7);
        expect(numbers.toFinite(undefined, 7)).toBe(7);
    });

    test("random(min, max) stays within the inclusive range", () => {
        for (let i = 0; i < 100; i++) {
            const value = numbers.random(0, 10);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(10);
            expect(Number.isInteger(value)).toBeTrue();
        }

        expect(numbers.random(5, 5)).toBe(5);
    });
});
