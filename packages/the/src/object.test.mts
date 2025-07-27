import {describe, expect, test} from "bun:test";
import {fromEntries, toEntries} from "./object.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("Object", () => {
    test("toEntries", () => {
        const actual = toEntries({a: 1, b: 2});

        expect(actual).toEqual([
            ["a", 1],
            ["b", 2],
        ]);
    });

    test("fromEntries", () => {
        const actual = fromEntries([
            ["a", 1],
            ["b", 2],
        ]);

        expect(actual).toEqual({a: 1, b: 2});
    });
});
