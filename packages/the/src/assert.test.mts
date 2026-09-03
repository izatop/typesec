import {describe, expect, test} from "bun:test";
import {assert, AssertionError} from "./assert.mjs";

describe("assert", () => {
    test("passes through truthy values", () => {
        expect(() => assert(true, "ok")).not.toThrow();
        expect(() => assert(1, "ok")).not.toThrow();
    });

    test("throws AssertionError with string message", () => {
        expect(() => assert(false, "failed")).toThrow(AssertionError);
        expect(() => assert(false, "failed")).toThrow("failed");

        try {
            assert(false, "failed");
        } catch (error) {
            expect(error).toMatchObject({name: "AssertionError", code: "ERR_ASSERTION"});
        }
    });

    test("uses Error message when message is an Error", () => {
        expect(() => assert(0, new Error("from error"))).toThrow("from error");
    });
});
