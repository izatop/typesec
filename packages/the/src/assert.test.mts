import {AssertionError} from "node:assert";
import {describe, expect, test} from "bun:test";
import {assert} from "./assert.mjs";

describe("assert", () => {
    test("passes through truthy values", () => {
        expect(() => assert(true, "ok")).not.toThrow();
        expect(() => assert(1, "ok")).not.toThrow();
    });

    test("throws AssertionError with string message", () => {
        expect(() => assert(false, "failed")).toThrow(AssertionError);
        expect(() => assert(false, "failed")).toThrow("failed");
    });

    test("uses Error message when message is an Error", () => {
        expect(() => assert(0, new Error("from error"))).toThrow("from error");
    });
});
