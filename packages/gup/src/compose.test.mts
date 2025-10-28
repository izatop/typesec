import {describe, expect, it} from "bun:test";
import {AssertionError} from "node:assert";
import {compose, composer} from "./composer.mts";
import {proto} from "./proto.mts";
import {scalars} from "./scalars.mts";

describe("Composer", async () => {
    it("test", async () => {
        composer.composeScalar(scalars.string, "");
    });

    it("compose(scalar, value) returns PackageAny", async () => {
        const input = "Hello, world!";
        const valid = await compose(scalars.string, input);

        expect(valid).toEqual({
            value: input,
            type: scalars.string,
        });
    });

    it("compose(scalar, invalid) returns Defect", async () => {
        const input = null;
        const valid = await compose(scalars.string, input);

        expect(valid).toEqual({
            input,
            type: scalars.string,
            reason: new AssertionError({message: "ASSERT_WRONG_VALUE_KIND"}),
            defect: true,
        });
    });

    it("compose(list, array) packages each element and reports unmatched", async () => {
        const T = proto.list([scalars.string, scalars.int]);
        const res = await compose(T, ["a", 1, false]);

        expect(res).toEqual({
            type: T,
            value: [
                {type: scalars.string, value: "a"},
                {type: scalars.int, value: 1},
                {
                    defect: true,
                    type: null,
                    input: false,
                    reason: new AssertionError({message: "ASSERT_CANNOT_SELECT_SUBJECT"}),
                },
            ],
        });
    });

    it("compose(list, non-array) returns Defect", async () => {
        const T = proto.list([scalars.string, scalars.int]);
        const res = await compose(T, 123);
        expect(res).toEqual({
            defect: true,
            input: 123,
            type: T,
            reason: new AssertionError({message: "ASSERT_WRONG_VALUE"}),
        });
    });

    it("compose(complex, object) packages each member and defects on invalid/missing", async () => {
        const C = proto.complex({
            id: "User",
            members: {
                name: scalars.string,
                age: scalars.int,
            },
        });

        const packed = await compose(C, {name: 1});

        expect(packed).toEqual({
            type: C,
            value: {
                name: {
                    defect: true,
                    type: scalars.string,
                    input: 1,
                    reason: new AssertionError({message: "ASSERT_WRONG_VALUE_KIND"}),
                },
                age: {
                    defect: true,
                    type: scalars.int,
                    input: undefined,
                    reason: new AssertionError({message: "ASSERT_WRONG_VALUE_KIND"}),
                },
            },
        });
    });

    it("compose(codec, value) returns PackageAny for codec kinds", async () => {
        const v = BigInt(42);
        const res = await compose(scalars.bigint, v);
        expect(res).toEqual({type: scalars.bigint, value: v});
    });

    it("compose(maybe, nullish) returns Defect (isKind fails)", async () => {
        const M = proto.maybe(scalars.string());
        const resNull = await compose(M, null);
        const resUndef = await compose(M, undefined);
        expect(resNull).toEqual({
            defect: true,
            type: M,
            input: null,
            reason: new AssertionError({message: "ASSERT_WRONG_VALUE"}),
        });
        expect(resUndef).toEqual({
            defect: true,
            type: M,
            input: undefined,
            reason: new AssertionError({message: "ASSERT_WRONG_VALUE"}),
        });
    });

    it("compose(maybe, valid subject) returns PackageMaybe with null value", async () => {
        const M = proto.maybe(scalars.string());
        const res = await compose(M, "ok");
        expect(res).toEqual({type: M, value: null});
    });

    it("compose(maybe, invalid value) returns Defect", async () => {
        const M = proto.maybe(scalars.string());
        const res = await compose(M, 123);
        expect(res).toEqual({
            defect: true,
            input: 123,
            type: M,
            reason: new AssertionError({message: "ASSERT_WRONG_VALUE"}),
        });
    });

    it("compose(union, any) picks matching subject or returns Defect", async () => {
        const U = proto.union([scalars.string, scalars.int]);
        const res1 = await compose(U, {});
        const res2 = await compose(U, 10);
        expect(res1).toEqual({
            defect: true,
            type: U,
            input: {},
            reason: new AssertionError({message: "ASSERT_CANNOT_SELECT_SUBJECT"}),
        });
        expect(res2).toEqual({type: U, value: {type: scalars.int, value: 10}});
    });

    it("compose(tuple, array) returns PackageTuple or Defect on length", async () => {
        const T = proto.tuple<[string, number]>([scalars.string(), scalars.int()]);
        const res1 = await compose(T, ["x", 1]);
        const res2 = await compose(T, ["x", 1, 2]);
        expect(res1).toEqual({
            type: T,
            value: [
                {type: scalars.string(), value: "x"},
                {type: scalars.int(), value: 1},
            ],
        });
        expect(res2).toEqual({
            defect: true,
            type: T,
            input: ["x", 1, 2],
            reason: new AssertionError({message: "ASSERT_WRONG_TUPLE_LENGHT"}),
        });
    });

    it("compose(list, only invalids) yields defects for each element", async () => {
        const L = proto.list([scalars.string, scalars.int]);
        const res = await compose(L, [{}]);
        expect(res).toEqual({
            type: L,
            value: [
                {
                    defect: true,
                    type: null,
                    input: {},
                    reason: new AssertionError({message: "ASSERT_CANNOT_SELECT_SUBJECT"}),
                },
            ],
        });
    });

    it("compose(complex, valid object) packages members as PackageAny", async () => {
        type MyRec = {
            name: string;
            age: number;
        };

        const C = proto.complex<MyRec>({
            id: "User",
            members: {
                name: scalars.string,
                age: scalars.int,
            },
        });

        const packed = await compose(C, {name: "John", age: 10});

        expect(packed).toEqual({
            type: C,
            value: {
                name: {type: scalars.string, value: "John"},
                age: {type: scalars.int, value: 10},
            },
        });
    });
});
