import {describe, expect, it} from "bun:test";
import {AssertionError} from "node:assert";
import {compose} from "./composer.mts";
import {scalars} from "./scalars.mts";

describe("ComposerFactory", () => {
    it("should factory Package<T>", async () => {
        const input = "Hello, world!";
        const valid = compose(scalars.string, input);

        expect(valid).toEqual({
            value: input,
            type: scalars.string,
        });
    });

    it("should factory Defect<T>", async () => {
        const input = null;
        const valid = compose(scalars.string, input);

        expect(valid).toEqual({
            input,
            type: scalars.string,
            reason: new AssertionError({message: "ASSERT_WRONG_VALUE"}),
        });
    });
});
