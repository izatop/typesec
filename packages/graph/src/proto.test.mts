import {isXEqualToY} from "@typesec/the";
import {describe, expect, test} from "bun:test";
import type {Proto} from "./interfaces.mts";
import {array, getProtoOf, isProto, nullable} from "./proto.mts";
import {scalars} from "./scalars.mts";

describe("proto(schema)", () => {
    test("nullable(type) should work", () => {
        const nullableString = nullable(scalars.string());
        expect(nullableString.validate(null)).toBeTrue();
        expect(nullableString.validate(undefined)).toBeTrue();
        expect(nullableString.validate("string")).toBeTrue();
        expect(nullableString.validate(-1)).toBeFalse();
        expect(isXEqualToY<typeof nullableString, Proto.NullishType<Proto.Primitive<"string", string>>>(true));
    });

    test("array(type) should work", () => {
        const numbers = array(scalars.int());
        expect(numbers.validate(1)).toBeFalse();
        expect(numbers.validate([1, 2, 3])).toBeTrue();
        expect(numbers.validate([1, 2, true])).toBeFalse();
        expect(isXEqualToY<typeof numbers, Proto.ArrayType<Proto.Primitive<"int", number>>>(true));
    });

    test("array(nullable(type)) should work", () => {
        const type = array(nullable(scalars.int()));

        expect(type.validate([null])).toBeTrue();
        expect(type.validate([1, 2, null, 3])).toBeTrue();
        expect(type.validate([1, 2, undefined, 3])).toBeTrue();
    });

    test("array(array(type)) should work", () => {
        const type = array(array(scalars.int()));

        expect(type.validate([])).toBeTrue();
        expect(type.validate([[]])).toBeTrue();
        expect(type.validate([[1, 2]])).toBeTrue();
        expect(type.validate([1])).toBeFalse();
    });

    test("getProtoOf(proto) should work", () => {
        expect(getProtoOf(scalars.string)).toBe(scalars.string.type);
    });

    test("isProto(value) should work", () => {
        expect(isProto(getProtoOf(scalars.string))).toBeTrue();
        expect(isProto(null)).toBeFalse();
    });
});
