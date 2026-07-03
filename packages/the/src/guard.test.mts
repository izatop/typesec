import {describe, expect, test} from "bun:test";
import {guard, make} from "./guard.mjs";

describe("guard", () => {
    test("make(validator) should return a type guard", () => {
        const isString = make<string>((value) => typeof value === "string");

        expect(isString("value")).toBeTrue();
        expect(isString(1)).toBeFalse();
    });

    test("guard.make mirrors the named export", () => {
        const isPositive = guard.make<number>((value) => typeof value === "number" && value > 0);

        expect(isPositive(1)).toBeTrue();
        expect(isPositive(0)).toBeFalse();
    });
});
