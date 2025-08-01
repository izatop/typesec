import {describe, expect, it} from "bun:test";
import {array} from "./array.mts";

describe("array", () => {
    it("uniq(T[]) should work", () => {
        expect(array.uniq([1, 1])).toEqual([1]);
    });
});
