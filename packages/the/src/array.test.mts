import {describe, expect, it} from "bun:test";
import {array} from "./array.mjs";

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

    it("dearraify(value) should unwrap the first item and passthrough scalars", () => {
        expect(array.dearraify([1, 2])).toBe(1);
        expect(array.dearraify([])).toBeUndefined();
        expect(array.dearraify("x")).toBe("x");
    });

    it("uniq(values, map) should dedupe by mapped value", () => {
        const list = [
            {id: 1, v: "a"},
            {id: 1, v: "b"},
            {id: 2, v: "c"},
        ];
        expect(array.uniq(list, (x) => x.id)).toEqual([1, 2]);
    });

    it("group(values, by) should collect values under derived keys", () => {
        const groups = array.group(["ant", "ape", "bat"], (value) => value[0]);

        expect(groups.get("a")).toEqual(["ant", "ape"]);
        expect(groups.get("b")).toEqual(["bat"]);
        expect(groups.size).toBe(2);
    });

    it("async.shift(input) should resolve first item from promises and thunks", async () => {
        expect(await array.async.shift(Promise.resolve([1, 2]))).toBe(1);
        expect(await array.async.shift(() => Promise.resolve(["a", "b"]))).toBe("a");
        expect(await array.async.shift([])).toBeUndefined();
    });
});
