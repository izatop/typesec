import {describe, expect, test} from "bun:test";
import z from "zod";
import {contract} from "./contract.mts";

describe("Contract", () => {
    test("test", async () => {
        const input = z.string();
        const output = z.number();
        const charsCount = contract({input, output});
        expect(charsCount.config).toEqual({input, output});
    });
});
