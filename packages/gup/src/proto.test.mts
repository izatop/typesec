import {isXEqualToY} from "@typesec/the/test";
import type {Fn} from "@typesec/the/type";
import {describe, expect, it} from "bun:test";
import type {Proto} from "./proto.mts";

describe("Proto", () => {
    type StringProto = Proto.Base<"name", "primitive", string>;

    it("Base<ID, Kind, T>", () => {
        type Test = Proto.Base<"name", "primitive", string>;

        expect(isXEqualToY<Test["id"], "name">(true)).toBeTrue();
        expect(isXEqualToY<Test["kind"], "primitive">(true)).toBeTrue();
        expect(isXEqualToY<Test["is"], (value: unknown) => value is string>(true)).toBeTrue();
    });

    it("JSONValue<ID, JSONKind, Primitive>", () => {
        type Test = Proto.JSONValue<"string", string>;
        expect(isXEqualToY<Test, Proto.Base<"string", "primitive", string>>(true)).toBeTrue();
    });

    it("Codec<ID, T>", () => {
        type Test = Proto.Codec<"datetime", Date>;

        expect(isXEqualToY<Test["encode"], Fn<[Date], string>>(true)).toBeTrue();
        expect(isXEqualToY<Test["decode"], Fn<[string], Date>>(true)).toBeTrue();
    });

    it("List<ID, T, C>", () => {
        type Test = Proto.List<string, StringProto>;

        expect(isXEqualToY<Test["element"], StringProto>(true)).toBeTrue();
    });

    it("Nullable<ID, T, C>", () => {
        type Test = Proto.Nullable<string, StringProto>;

        expect(isXEqualToY<Test["type"], StringProto>(true)).toBeTrue();
    });
});
