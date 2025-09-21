import {describe, expect, test} from "bun:test";
import {isXEqualToY, isXExtendsOfY} from "./test.mjs";
import type {
    Arrayify,
    DeArrayify,
    DeFnify,
    Drop,
    Entries,
    Exact,
    Fn,
    Fnify,
    FromEntries,
    Guard,
    GuardUnion,
    HasKeyOf,
    HasNull,
    HasUndefined,
    HasUnknown,
    IfTrue,
    InferArray,
    IsAny,
    IsArray,
    IsNever,
    IsNullable,
    IsUnknown,
    KeyOf,
    KeyOfValue,
    Label,
    LikeString,
    Nullable,
    Nullish,
    Override,
    PairKeyOf,
    PartialKeys,
    Promisify,
    Prop,
    Rec,
    Recify,
    RecKey,
    ReMap,
    RequiresKeysOf,
    StrictRec,
    StringKeyOf,
    ToAny,
    ToNullish,
    ValueOf,
} from "./type.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("Type", () => {
    test("Fn<A, R>", () => {
        type T1 = Fn<[], void>;
        expect(isXEqualToY<T1, () => void>(true)).toBeTrue();

        type T2 = Fn<[number], void>;
        expect(isXEqualToY<T2, (...args: [number]) => void>(true)).toBeTrue();

        type T3 = Fn<[Date], string>;
        expect(isXEqualToY<T3, (...args: [Date]) => string>(true)).toBeTrue();
    });

    test("Fnfy<T>", () => {
        type T1 = Fnify<number>;
        expect(isXEqualToY<T1, {(): number} | number>(true)).toBeTrue();
    });

    test("DeFnify<T>", () => {
        type T1 = DeFnify<number>;
        type T2 = DeFnify<Fnify<number>>;
        expect(isXEqualToY<T1, number>(true)).toBeTrue();
        expect(isXEqualToY<T2, number>(true)).toBeTrue();
    });

    test("Rec<K, T>", () => {
        type T1 = Rec<string, number>;
        expect(isXEqualToY<T1, Record<string, number>>(true)).toBeTrue();
    });

    test("Prop<T, K>", () => {
        type T1 = {foo: number};
        expect(isXEqualToY<Prop<T1, "foo">, number>(true)).toBeTrue();
    });

    test("Drop<T, V>", () => {
        type T1 = {foo: number; bar: null};
        expect(isXEqualToY<Drop<T1, null>, {foo: number}>(true)).toBeTrue();
    });

    test("ReMap<T, V>", () => {
        type T1 = {foo: number};
        expect(isXEqualToY<ReMap<T1, string>, {foo: string}>(true)).toBeTrue();
    });

    test("ToEntries", () => {
        type T1 = {foo: number};
        expect(isXEqualToY<Entries<T1>[], [keyof T1, number][]>(true)).toBeTrue();
    });

    test("FromEntries", () => {
        type T1 = {foo: number; bar: string};
        type R1 = Entries<T1>[];
        expect(isXEqualToY<FromEntries<R1>, T1>(true)).toBeTrue();
    });

    test("Arrayify<T>", () => {
        type T1 = Arrayify<number>;
        expect(isXEqualToY<T1, number | number[]>(true)).toBeTrue();
    });

    test("DeArrayify<T>", () => {
        type T1 = DeArrayify<number[]>;
        expect(isXEqualToY<T1, number>(true)).toBeTrue();
        expect(isXEqualToY<T1, number[]>(false)).toBeFalse();

        type T2 = DeArrayify<string>;
        expect(isXEqualToY<T2, string>(true)).toBeTrue();
    });

    test("Promisify<T>", () => {
        type T1 = Promisify<number>;
        expect(isXEqualToY<T1, number | Promise<number> | PromiseLike<number>>(true)).toBeTrue();
    });

    test("InferArray<T>", () => {
        type A = InferArray<[1, 2, 3]>;
        expect(isXEqualToY<A, 1 | 2 | 3>(true)).toBeTrue();
    });

    test("KeyOf<T>", () => {
        type T1 = KeyOf<Rec<string>>;
        expect(isXEqualToY<T1, string>(true)).toBeTrue();

        type T2 = KeyOf<Rec<string | number | symbol>>;
        expect(isXEqualToY<T2, string | number | symbol>(true)).toBeTrue();

        type T3 = KeyOf<{key: number; [k: symbol]: number}>;
        expect(isXEqualToY<T3, "key" | symbol>(true)).toBeTrue();
    });

    test("KeyOf<T, I>", () => {
        type D1 = Rec<string | number | symbol>;
        expect(isXEqualToY<KeyOf<D1, string>, string>(true)).toBeTrue();
        expect(isXEqualToY<KeyOf<D1, number>, number>(true)).toBeTrue();
        expect(isXEqualToY<KeyOf<D1, symbol>, symbol>(true)).toBeTrue();
        expect(isXEqualToY<KeyOf<D1, any>, string | number | symbol>(true)).toBeTrue();
    });

    test("ValueOf<T>", () => {
        type T = {a: 1; b: "x"};
        expect(isXEqualToY<ValueOf<T>, 1 | "x">(true)).toBeTrue();
    });

    test("KeyOfValue<T, V>", () => {
        type T = {a: 1; b: "x"; c: 1 | "x"};
        expect(isXEqualToY<KeyOfValue<T, 1>, "a" | "c">(true)).toBeTrue();
    });

    test("StringKeyOf<T>", () => {
        type T = {a: number; [k: symbol]: number};
        expect(isXEqualToY<StringKeyOf<T>, "a">(true)).toBeTrue();
    });

    test("PairKeyOf<TSpec, TQuery>", () => {
        type S = {a: 1; b: 2; c: 3};
        type Q = {b: 2; c: 4; d: 5};
        expect(isXEqualToY<PairKeyOf<S, Q>, "b" | "c">(true)).toBeTrue();
    });

    test("Nullable<T>", () => {
        type T1 = Nullable<number>;
        expect(isXEqualToY<T1, number | null | undefined>(true)).toBeTrue();
    });

    test("Nullish<T>", () => {
        type T1 = Nullish<number>;
        expect(isXEqualToY<T1, number | null>(true)).toBeTrue();
    });

    test("ToAny<T>", () => {
        expect(isXEqualToY<ToAny<number, 1>, 1>(true)).toBeTrue();
        expect(isXEqualToY<ToAny<number | any, 1>, any>(true)).toBeTrue();
    });

    test("ToNullish<T>", () => {
        expect(isXEqualToY<ToNullish<string>, string>(true)).toBeTrue();
        expect(isXEqualToY<ToNullish<string | null>, string | null>(true)).toBeTrue();
        expect(isXEqualToY<ToNullish<string | undefined>, string | null>(true)).toBeTrue();
    });

    test("HasNull<T>", () => {
        expect(isXEqualToY<HasNull<number>, false>(true)).toBeTrue();
        expect(isXEqualToY<HasNull<number | null>, true>(true)).toBeTrue();
    });

    test("HasUndefined<T>", () => {
        expect(isXEqualToY<HasUndefined<number>, false>(true)).toBeTrue();
        expect(isXEqualToY<HasUndefined<number | null>, false>(true)).toBeTrue();
        expect(isXEqualToY<HasUndefined<number | null | undefined>, true>(true)).toBeTrue();
    });

    test("HasNullOrUndefined<T>", () => {
        expect(isXEqualToY<IsNullable<number>, false>(true)).toBeTrue();
        expect(isXEqualToY<IsNullable<number | null>, true>(true)).toBeTrue();
        expect(isXEqualToY<IsNullable<number | null | undefined>, true>(true)).toBeTrue();
    });

    test("IfTrue<T>", () => {
        expect(isXEqualToY<IfTrue<true, 1, 0>, 1>(true)).toBeTrue();
        expect(isXEqualToY<IfTrue<false, 1, 0>, 0>(true)).toBeTrue();
        expect(isXEqualToY<IfTrue<false, 1>, never>(true)).toBeTrue();
    });

    test("IsArray<T>", () => {
        expect(isXEqualToY<IsArray<Rec>, false>(true)).toBeTrue();
        expect(isXEqualToY<IsArray<number>, false>(true)).toBeTrue();
        expect(isXEqualToY<IsArray<number[]>, true>(true)).toBeTrue();
    });

    test("IsNever<T>", () => {
        expect(isXEqualToY<IsNever<never>, true>(true)).toBeTrue();
        expect(isXEqualToY<IsNever<string>, false>(true)).toBeTrue();
    });

    test("IsAny<T>", () => {
        expect(isXEqualToY<IsAny<any>, true>(true)).toBeTrue();
        expect(isXEqualToY<IsAny<string>, false>(true)).toBeTrue();
    });

    test("IsUnknown<T> and HasUnknown<T>", () => {
        expect(isXEqualToY<IsUnknown<unknown>, true>(true)).toBeTrue();
        expect(isXEqualToY<IsUnknown<any>, false>(true)).toBeTrue();
        expect(isXEqualToY<HasUnknown<unknown>, true>(true)).toBeTrue();
        expect(isXEqualToY<HasUnknown<string>, false>(true)).toBeTrue();
        expect(isXEqualToY<HasUnknown<string | unknown>, true>(true)).toBeTrue();
    });

    test("Exact<T, Shape>", () => {
        type T1 = Exact<{a: number}, {a: number}>;
        type T2 = Exact<{a: number; b: number}, {a: number}>;
        expect(isXEqualToY<T1, {a: number}>(true)).toBeTrue();
        expect(isXEqualToY<T2, never>(true)).toBeTrue();
    });

    test("Label<T>", () => {
        type L = Label<1>;
        expect(isXExtendsOfY<L, object>(true)).toBeTrue();
        expect(isXEqualToY<L, 1>(false)).toBeFalse();
    });

    test("Override, Expand", () => {
        type A = {a: number; b: string};
        type B = {b: boolean; c: Date};
        type R = Override<A, B>;
        const value: R = {a: 1, b: true, c: new Date()};
        expect(!!value).toBeTrue();
    });

    test("StrictRec<T> and Drop<T, V>", () => {
        type T = {a: number; b: string | undefined; c?: number; d: undefined};
        type R = StrictRec<T>;
        // drops properties where value type includes undefined
        expect(isXEqualToY<R, {a: number}>(true)).toBeTrue();
    });

    test("Recify<T, K> and RecKey", () => {
        type T = Recify<number>;
        expect(isXExtendsOfY<T, number | Record<string, number>>(true)).toBeTrue();
        expect(isXEqualToY<RecKey, string | number | symbol>(true)).toBeTrue();
    });

    test("RequiresKeysOf<T>", () => {
        type T = {a: number; b?: string; c: string | undefined; d: number | null};
        expect(isXEqualToY<RequiresKeysOf<T>, "a" | "d">(true)).toBeTrue();
    });

    test("HasKeyOf<T, K>", () => {
        type T = {a: number; b: string};
        expect(isXEqualToY<HasKeyOf<T, "a">, true>(true)).toBeTrue();
        expect(isXEqualToY<HasKeyOf<T, "c">, false>(true)).toBeTrue();
    });

    test("PartialKeys<T, K>", () => {
        type T = {a: number; b: string; c: boolean};
        type R = PartialKeys<T, "a" | "c">;
        const v: R = {b: "x"};
        v.a = 1;
        expect(!!v).toBeTrue();
    });

    test("Guard<T> and GuardUnion<T, U>", () => {
        const isNum: Guard<number> = (v: unknown): v is number => typeof v === "number";
        const isNumFromUnion: GuardUnion<number, string> = (v: number | string): v is number => typeof v === "number";
        expect(isNum(1)).toBeTrue();
        expect(isNumFromUnion(2)).toBeTrue();
        expect(isNumFromUnion("x")).toBeFalse();
    });

    test("LikeString", () => {
        const likeString = {
            toString() {
                return "id";
            },
        };

        const likeNotString = {
            toString() {
                return 123;
            },
        };

        expect(isXExtendsOfY<string | number | symbol | boolean, LikeString>(true)).toBeTrue();
        expect(isXExtendsOfY<typeof likeString, LikeString>(true)).toBeTrue();
        expect(isXEqualToY<null, LikeString>(false)).toBeFalse();
        expect(isXEqualToY<undefined, LikeString>(false)).toBeFalse();
        expect(isXExtendsOfY<typeof likeNotString, LikeString>(false)).toBeFalse();
    });
});
