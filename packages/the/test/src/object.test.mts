import {describe, test} from "bun:test";
import assert from "node:assert";
import {fromEntries, toEntries} from "../../src/object.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("Object", () => {
    test("toEntries", () => {
        const actual = toEntries({a: 1, b: 2});

        assert.deepEqual(actual, [
            ["a", 1],
            ["b", 2],
        ]);
    });

    test("fromEntries", () => {
        const actual = fromEntries([
            ["a", 1],
            ["b", 2],
        ]);

        assert.deepEqual(actual, {a: 1, b: 2});
    });
});
