import {describe, expect, test} from "bun:test";
import {MyBackend} from "./test/backend.mts";

describe("Backend", () => {
    test("createStatic(ctx)", async () => {
        const MyResolvers = MyBackend.createStatic(Math);

        const input = "Hello, World!";
        const result = await MyResolvers.strings.count(input);
        expect(result).toBe(input.length);
    });

    test("execute(ctx, query)", async () => {
        const input = "Hello, World!";
        const res = await MyBackend.execute(Math, {
            strings: {
                count: [input],
            },
        });

        expect(res).toEqual({strings: {count: input.length}});
    });
});
