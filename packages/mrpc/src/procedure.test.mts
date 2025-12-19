import {describe, expect, test} from "bun:test";
import {procedure} from "./procedure.mts";
import {StringCountContract} from "./test/contracts.mts";

describe("Procedure", () => {
    test("procedure", async () => {
        const charsCount = procedure(StringCountContract, ({input}) => input.length);

        const input = "Hello, World!";
        const count = charsCount.encode(undefined, input);
        expect(count).toBe(input.length);
    });

    test("factory", async () => {});
});
