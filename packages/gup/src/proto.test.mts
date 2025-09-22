import {is} from "@typesec/the/fn";
import {isXEqualToY} from "@typesec/the/test";
import {type Fn, type Guard, type GuardUnion, type Nullable, type Promisify, type Rec} from "@typesec/the/type";
import {describe, expect, it} from "bun:test";
import {codec, complex, list, scalar, tuple, union, type Proto} from "./proto.mts";
import {scalars} from "./scalars.mts";

describe("Types", () => {
    it("Base<ID, Kind, T>", () => {
        type Test = Proto.Base<"name", "string", string, string>;

        expect(isXEqualToY<Test["id"], "name">(true)).toBeTrue();
        expect(isXEqualToY<Test["kind"], "string">(true)).toBeTrue();
        expect(isXEqualToY<Test["isKind"], (value: unknown) => value is string>(true)).toBeTrue();
        expect(isXEqualToY<Test["isValid"], (value: string) => value is string>(true)).toBeTrue();
    });

    it("Scalar<ID, ScalarKind, Scalar>", () => {
        type T1 = Proto.Scalar<"ID", "string", string>;
        expect(isXEqualToY<T1, Proto.Base<"ID", "string", string, string>>(true)).toBeTrue();
    });

    it("ScalarShape<ScalarKind>", () => {
        type s = Proto.ScalarShape<"string">;
        type b = Proto.ScalarShape<"boolean">;
        type n = Proto.ScalarShape<"number">;
        expect(isXEqualToY<s, string>(true)).toBeTrue();
        expect(isXEqualToY<b, boolean>(true)).toBeTrue();
        expect(isXEqualToY<n, number>(true)).toBeTrue();
    });

    it("CodecInitializer<ID, T>", () => {
        type Test = Proto.CodecInitializer<"datetime", Date>;

        expect(isXEqualToY<Test["encode"], Fn<[Date], Promisify<string>>>(true)).toBeTrue();
        expect(isXEqualToY<Test["decode"], Fn<[string], Promisify<unknown>>>(true)).toBeTrue();
        expect(isXEqualToY<Test["isKind"], Guard<Date>>(true)).toBeTrue();
        expect(isXEqualToY<Test["isValid"], GuardUnion<Date>>(true)).toBeTrue();
    });

    it("Codec<ID, T>", () => {
        type Test = Proto.Codec<"datetime", Date>;

        expect(isXEqualToY<Test["encode"], Fn<[Date], Promise<Proto.CodecRaw>>>(true)).toBeTrue();
        expect(isXEqualToY<Test["decode"], Fn<[unknown], Promise<unknown>>>(true)).toBeTrue();
        expect(isXEqualToY<Test["isKind"], Guard<Date>>(true)).toBeTrue();
        expect(isXEqualToY<Test["isValid"], GuardUnion<Date>>(true)).toBeTrue();
    });

    it("Array<T>", () => {
        type Test = Proto.List<string>;

        expect(isXEqualToY<Test["subject"], Proto.DistributeToAny<string>[]>(true)).toBeTrue();
        expect(isXEqualToY<Test["isKind"], Guard<unknown[]>>(true)).toBeTrue();
        expect(isXEqualToY<Test["isValid"], GuardUnion<string[], unknown[]>>(true)).toBeTrue();
    });

    it("Maybe<T>", () => {
        type Test = Proto.Maybe<string>;

        expect(isXEqualToY<Test["subject"], Proto.Any<string>>(true)).toBeTrue();
        expect(isXEqualToY<Test["isKind"], Guard<Nullable<string>>>(true)).toBeTrue();
        expect(isXEqualToY<Test["isValid"], GuardUnion<Nullable<string>, Nullable<string>>>(true)).toBeTrue();
    });

    it("Tuple<[A, B]>", () => {
        type T = [string, number];
        type Test = Proto.Tuple<T>;

        expect(isXEqualToY<Test["subject"], Proto.CompositeTuple<T>["subject"]>(true)).toBeTrue();
        expect(isXEqualToY<Test["subject"], [Proto.Any<string>, Proto.Any<number>]>(true)).toBeTrue();
        expect(isXEqualToY<Test["isKind"], Guard<readonly unknown[]>>(true)).toBeTrue();
        expect(isXEqualToY<Test["isValid"], GuardUnion<T, readonly unknown[]>>(true)).toBeTrue();
        expect(isXEqualToY<Proto.Infer<Test>, T>(true)).toBeTrue();
    });

    it("Union<A | B>", () => {
        type T = string | number | boolean;
        type Test = Proto.Union<T>;

        expect(isXEqualToY<Test["subject"], Proto.CompositeUnion<T>["subject"]>(true)).toBeTrue();
        expect(isXEqualToY<Test["isKind"], Guard<unknown>>(true)).toBeTrue();
        expect(isXEqualToY<Test["isValid"], GuardUnion<T, unknown>>(true)).toBeTrue();
    });

    it("Complex<ID, T>", () => {
        type T = {name: string};
        type Test = Proto.Complex<"T", T>;

        expect(isXEqualToY<Test["kind"], "complex">(true)).toBeTrue();
        expect(isXEqualToY<Test["isKind"], Guard<Rec<string, unknown>>>(true)).toBeTrue();
        expect(isXEqualToY<Test["isValid"], GuardUnion<T, Rec<string, unknown>>>(true)).toBeTrue();
        expect(isXEqualToY<Proto.Infer<Test>, T>(true)).toBeTrue();
    });
});

describe("Factories", () => {
    it("scalar(args)", () => {
        const id = "MyString";
        const MyString = scalar({
            id,
            kind: "string",
            isValid: (value): value is string => is(value, "string"),
        });

        expect(MyString.id).toBe(id);
        expect(MyString.kind).toBe("string");
        expect(MyString.isKind("s")).toBeTrue();
        expect(MyString.isKind(null)).toBeFalse();
        expect(MyString.isValid("s")).toBeTrue();

        // @ts-expect-error
        expect(MyString.isValid(null)).toBeFalse();
    });

    it("codec(args)", async () => {
        const id = "buffer";
        const data: Buffer = Buffer.from("hello");

        const MyCodec = codec({
            id,
            isKind: Buffer.isBuffer,
            isValid: Buffer.isBuffer,
            encode: (value) => value.toString("hex"),
            decode: (value) => Buffer.from(value, "hex"),
        });

        expect(MyCodec.id).toBe(id);
        expect(MyCodec.kind).toBe("codec");
        expect(MyCodec.isKind(data)).toBeTrue();
        expect(MyCodec.isKind(1)).toBeFalse();
        await expect(MyCodec.encode(data)).resolves.toEqual([id, data.toString("hex")]);
        await expect(MyCodec.decode([id, data.toString("hex")])).resolves.toEqual(data);
    });

    it("list(args)", () => {
        const kind: Proto.ListKind = "array";
        const MyList = list(scalars.string());

        expect(MyList.kind).toBe(kind);
        expect(MyList.isKind([])).toBeTrue();
        expect(MyList.isValid(["value"])).toBeTrue();
        expect(MyList.isValid([null])).toBeFalse();
    });

    it("list(args[])", () => {
        const kind: Proto.ListKind = "array";
        const MyList = list([scalars.string(), scalars.int()]);

        expect(MyList.kind).toBe(kind);
        expect(MyList.isKind([])).toBeTrue();
        expect(MyList.isValid([])).toBeTrue();
        expect(MyList.isValid([1, "s"])).toBeTrue();
        expect(MyList.isValid([1, "s", false])).toBeFalse();
    });

    it("union(args[])", () => {
        const kind: Proto.UnionKind = "union";
        const MyList = union([scalars.string(), scalars.int()]);

        expect(MyList.kind).toBe(kind);

        // Unions isKind is always returns true
        expect(MyList.isKind({})).toBeTrue();

        expect(MyList.isValid("s")).toBeTrue();
        expect(MyList.isValid(1)).toBeTrue();
        expect(MyList.isValid({})).toBeFalse();
    });

    it("tuple([a, b, ...etc])", () => {
        const kind: Proto.TupleKind = "tuple";
        const MyList = tuple([scalars.string(), scalars.int()]);

        expect(MyList.kind).toBe(kind);
        expect(MyList.isKind([])).toBeTrue();
        expect(MyList.isValid(["s", 1])).toBeTrue();
        expect(MyList.isValid(["s", 1, 2])).toBeFalse();
        expect(MyList.isValid(["s", "s"])).toBeFalse();
        expect(MyList.isValid([1, "s"])).toBeFalse();
        expect(MyList.isValid([])).toBeFalse();
    });

    it("complex(args)", () => {
        type MyType = {
            name: string;
            age: number;
            bd: Date;
        };

        const id = "MyComplex";
        const MyComplex = complex<MyType>({
            id,
            members: {
                name: scalars.string,
                age: scalars.int,
                bd: scalars.ISODate,
            },
        });

        expect(MyComplex.isKind({})).toBeTrue();
        expect(MyComplex.isKind(null)).toBeFalse();
        expect(MyComplex.isValid({})).toBeFalse();
    });
});
