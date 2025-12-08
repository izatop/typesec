import {describe, expect, test} from "bun:test";
import {procedure} from "./procedure.mts";
import {StringCountContract} from "./test/contracts.mts";

describe("Procedure", () => {
    test("test", async () => {
        const charsCount = procedure(StringCountContract, ({input}) => input.length);

        const input = "Hello, World!";
        const count = await charsCount.encode(input, undefined);
        expect(count).toBe(input.length);
    });
});
