import {describe, expect, it} from "bun:test";
import {string} from "./string.mjs";

describe("string", () => {
    it("cmp(a, b) should work", () => {
        expect(string.cmp("a", "a")).toBeTrue();
        expect(string.cmp("A", "a")).toBeTrue();
        expect(string.cmp("a", "b")).toBeFalse();
        expect(string.cmp(null, null)).toBeTrue();
        expect(string.cmp(undefined as any, undefined as any)).toBeTrue();
        expect(string.cmp("a", null)).toBeFalse();
    });

    it("lower(str) should work", () => {
        expect(string.lower("AAA")).toBe("aaa");
    });

    it("upper(str) should work", () => {
        expect(string.upper("aaa")).toBe("AAA");
    });
});
