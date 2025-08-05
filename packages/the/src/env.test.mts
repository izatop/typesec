import {describe, expect, test} from "bun:test";
import {createStrict} from "./env.mts";

// type T1 = Expect<Equal<A, B>>;

describe("env", () => {
    test("createStatic", () => {
        type StrictEnv = {
            required: string;
            optional?: string;
        };

        const env1 = createStrict<StrictEnv>({required: "default"}, {});
        expect(env1.required).toBe("default");

        expect(() => createStrict<StrictEnv>({required: true}, {})).toThrowError();
        const env2 = createStrict<StrictEnv>({required: true}, {required: "required"});
        expect(env2.required).toBe("required");
    });
});
