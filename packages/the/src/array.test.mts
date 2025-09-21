import {describe, expect, it} from "bun:test";
import {array} from "./array.mts";

describe("array", () => {
    it("uniq(T[]) should work", () => {
        const list = [1, 1, 2, 3, 3, 3, 4];
        expect(array.uniq(list)).toEqual([1, 2, 3, 4]);
    });

    it("arraify(value) should wrap non-array and passthrough arrays", () => {
        expect(array.arraify(1)).toEqual([1]);
        expect(array.arraify([1, 2])).toEqual([1, 2]);
        expect(array.arraify("x")).toEqual(["x"]);
    });

    it("uniq(values, map) should dedupe by mapped value", () => {
        const list = [
            {id: 1, v: "a"},
            {id: 1, v: "b"},
            {id: 2, v: "c"},
        ];
        expect(array.uniq(list, (x) => x.id)).toEqual([1, 2]);
    });
});
