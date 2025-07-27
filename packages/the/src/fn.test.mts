import {deepEquals} from "bun";
import {describe, test} from "bun:test";
import {when} from "./fn.mjs";

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

        deepEquals(
            expected,
            tests.map(([, res]) => res),
        );
    });
});
