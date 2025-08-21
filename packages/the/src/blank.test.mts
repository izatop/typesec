import {describe, expect, test} from "bun:test";
import {isBlank} from "./blank.mts";

describe("isBlank", async () => {
    test("should work with strings", () => {
        expect(isBlank("")).toBeTrue();
        expect(isBlank("hello")).toBeFalse();
    });

    test("should work with arrays", () => {
        expect(isBlank([])).toBeTrue();
        expect(isBlank(Array.from({length: 1}))).toBeTrue();
        expect(isBlank([1])).toBeFalse();
    });

    test("should work with undefined", () => {
        expect(isBlank(undefined)).toBeTrue();
    });

    test("should work with object", () => {
        expect(isBlank({})).toBeTrue();
        expect(isBlank(null)).toBeTrue();
        expect(isBlank({v: 1})).toBeFalse();
    });
});
