import {isXEqualToY} from "@typesec/the";
import {describe, expect, test} from "bun:test";
import {MyBackend} from "./test/backend.mjs";

describe("Backend", () => {
    test("createStatic(ctx)", async () => {
        const MyResolvers = MyBackend.createStatic(Math);

        const input = "Hello, World!";
        const result = MyResolvers.strings.count(input);
        expect(result).toBe(input.length);

        type CountReturnType = ReturnType<typeof MyResolvers.strings.count>;
        expect(isXEqualToY<CountReturnType, number>(true));

        const result2 = await MyResolvers.strings.async({});
        expect(result2).toBeNumber();

        type CountReturnType2 = ReturnType<typeof MyResolvers.strings.async>;
        expect(isXEqualToY<CountReturnType2, Promise<number>>(true));
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
