import {describe, expect, test} from "bun:test";
import {isXEqualToY, isXExtendsOfY} from "./test.mjs";
import type {
    Arrayify,
    DeArrayify,
    Entries,
    Fn,
    Fnify,
    FromEntries,
    HasNull,
    HasUndefined,
    IfTrue,
    IsArray,
    IsNullable,
    KeyOf,
    LikeString,
    Nullable,
    Promisify,
    Prop,
    Rec,
    ReMap,
    ToAny,
} from "./type.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("Types", () => {
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

    test("Rec<K, T>", () => {
        type T1 = Rec<string, number>;
        expect(isXEqualToY<T1, Record<string, number>>(true)).toBeTrue();
    });

    test("Prop<T, K>", () => {
        type T1 = {foo: number};
        expect(isXEqualToY<Prop<T1, "foo">, number>(true)).toBeTrue();
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

    test("Nullable<T>", () => {
        type T1 = Nullable<number>;
        expect(isXEqualToY<T1, number | null | undefined>(true)).toBeTrue();
    });

    test("ToAny<T>", () => {
        expect(isXEqualToY<ToAny<number, 1>, 1>(true)).toBeTrue();
        expect(isXEqualToY<ToAny<number | any, 1>, any>(true)).toBeTrue();
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
