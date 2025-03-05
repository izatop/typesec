import assert from "node:assert";
import test, {describe} from "node:test";
import {when} from "../../src/fn.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("Object", () => {
    test("when<T, R1, R2>(value, then, ?fallback)", () => {
        const tests = [
            ["", false],
            [false, false],
            [1, true],
            ["foo", true],
            [true, true],
            [{}, true],
            [[], true],
        ];

        const expected = tests.map(([value]) =>
            when(
                value,
                () => true,
                () => false,
            ),
        );
        assert.deepEqual(
            expected,
            tests.map(([, res]) => res),
        );
    });
});
