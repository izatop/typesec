import {describe, expect, it} from "bun:test";
import {string} from "./string.mts";

describe("string", () => {
    it("cmp(a, b) should work", () => {
        expect(string.cmp("a", "a")).toBeTrue();
        expect(string.cmp("a", "b")).toBeFalse();
    });

    it("lower(str) should work", () => {
        expect(string.lower("AAA")).toBe("aaa");
    });

    it("upper(str) should work", () => {
        expect(string.upper("aaa")).toBe("AAA");
    });
});
