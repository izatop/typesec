import object from "@typesec/the/object";
import {describe, expect, test} from "bun:test";
import {wrap} from "./tracer.mjs";

describe("tracer", () => {
    test("wrap() should create custom tracer", () => {
        const tracer = wrap("name");
        expect(object.keys(tracer)).toEqual(["log", "info", "warn", "error"]);
    });
});
