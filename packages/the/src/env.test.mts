import {describe, expect, test} from "bun:test";
import {createStrict, detectRuntime, type RuntimeEnv} from "./env.mts";

// type T1 = Expect<Equal<A, B>>;

describe("env", () => {
    test("createStatic(requires, payload?)", () => {
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

    test("detectRuntime()", () => {
        let runtime: RuntimeEnv = "unknown";
        if (typeof globalThis.Bun !== "undefined") {
            runtime = "bun";
        } else if (
            typeof globalThis.process !== "undefined" &&
            typeof globalThis.process.versions?.node !== "undefined"
        ) {
            runtime = "node";
        } else if (Reflect.has(globalThis, "window")) {
            runtime = "browser";
        }

        expect(detectRuntime()).toBe(runtime);
    });
});
