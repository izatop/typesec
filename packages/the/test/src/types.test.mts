import {describe, test} from "bun:test";
import assert from "node:assert";
import type {
    Arrayify,
    DeArrayify,
    Entries,
    Fn,
    Fnify,
    FromEntries,
    HasNull,
    HasNullOrUndefined,
    HasUndefined,
    IfTrue,
    IsArray,
    KeyOf,
    LikeString,
    Nullable,
    Promisify,
    Prop,
    Rec,
    ReMap,
    ToAny,
} from "../../src/interfaces.mjs";
import {isXEqualToY, isXExtendsOfY} from "../../src/test.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("Types", () => {
    test("Fn<A, R>", () => {
        type T1 = Fn<[], void>;
        assert.ok(isXEqualToY<T1, () => void>(true));

        type T2 = Fn<[number], void>;
        assert.ok(isXEqualToY<T2, (...args: [number]) => void>(true));

        type T3 = Fn<[Date], string>;
        assert.ok(isXEqualToY<T3, (...args: [Date]) => string>(true));
    });

    test("Fnfy<T>", () => {
        type T1 = Fnify<number>;
        assert.ok(isXEqualToY<T1, {(): number} | number>(true));
    });

    test("Rec<K, T>", () => {
        type T1 = Rec<string, number>;
        assert.ok(isXEqualToY<T1, Record<string, number>>(true));
    });

    test("Prop<T, K>", () => {
        type T1 = {foo: number};
        assert.ok(isXEqualToY<Prop<T1, "foo">, number>(true));
    });

    test("ReMap<T, V>", () => {
        type T1 = {foo: number};
        assert.ok(isXEqualToY<ReMap<T1, string>, {foo: string}>(true));
    });

    test("ToEntries", () => {
        type T1 = {foo: number};
        assert.ok(isXEqualToY<Entries<T1>, [keyof T1, number][]>(true));
    });

    test("FromEntries", () => {
        type T1 = {foo: number};
        type R1 = Entries<T1>;
        assert.ok(isXEqualToY<FromEntries<R1>, T1>(true));
    });

    test("Arrayify<T>", () => {
        type T1 = Arrayify<number>;
        assert.ok(isXEqualToY<T1, number | number[]>(true));
    });

    test("DeArrayify<T>", () => {
        type T1 = DeArrayify<number[]>;
        assert.ok(isXEqualToY<T1, number>(true));
        assert.equal(isXEqualToY<T1, number[]>(false), false);

        type T2 = DeArrayify<string>;
        assert.ok(isXEqualToY<T2, string>(true));
    });

    test("Promisify<T>", () => {
        type T1 = Promisify<number>;
        assert.ok(isXEqualToY<T1, number | Promise<number> | PromiseLike<number>>(true));
    });

    test("KeyOf<T>", () => {
        type T1 = KeyOf<Rec<string>>;
        assert.ok(isXEqualToY<T1, string>(true));

        type T2 = KeyOf<Rec<string | number | symbol>>;
        assert.ok(isXEqualToY<T2, string | number | symbol>(true));

        type T3 = KeyOf<{key: number; [k: symbol]: number}>;
        assert.ok(isXEqualToY<T3, "key" | symbol>(true));
    });

    test("KeyOf<T, I>", () => {
        type D1 = Rec<string | number | symbol>;
        assert.ok(isXEqualToY<KeyOf<D1, string>, string>(true));
        assert.ok(isXEqualToY<KeyOf<D1, number>, number>(true));
        assert.ok(isXEqualToY<KeyOf<D1, symbol>, symbol>(true));
        assert.ok(isXEqualToY<KeyOf<D1, any>, string | number | symbol>(true));
    });

    test("Nullable<T>", () => {
        type T1 = Nullable<number>;
        assert.ok(isXEqualToY<T1, number | null | undefined>(true));
    });

    test("ToAny<T>", () => {
        assert.ok(isXEqualToY<ToAny<number, 1>, 1>(true));
        assert.ok(isXEqualToY<ToAny<number | any, 1>, any>(true));
    });

    test("HasNull<T>", () => {
        assert.ok(isXEqualToY<HasNull<number>, false>(true));
        assert.ok(isXEqualToY<HasNull<number | null>, true>(true));
    });

    test("HasUndefined<T>", () => {
        assert.ok(isXEqualToY<HasUndefined<number>, false>(true));
        assert.ok(isXEqualToY<HasUndefined<number | null>, false>(true));
        assert.ok(isXEqualToY<HasUndefined<number | null | undefined>, true>(true));
    });

    test("HasNullOrUndefined<T>", () => {
        assert.ok(isXEqualToY<HasNullOrUndefined<number>, false>(true));
        assert.ok(isXEqualToY<HasNullOrUndefined<number | null>, true>(true));
        assert.ok(isXEqualToY<HasNullOrUndefined<number | null | undefined>, true>(true));
    });

    test("IfTrue<T>", () => {
        assert.ok(isXEqualToY<IfTrue<true, 1, 0>, 1>(true));
        assert.ok(isXEqualToY<IfTrue<false, 1, 0>, 0>(true));
        assert.ok(isXEqualToY<IfTrue<false, 1>, never>(true));
    });

    test("IsArray<T>", () => {
        assert.ok(isXEqualToY<IsArray<Rec>, false>(true));
        assert.ok(isXEqualToY<IsArray<number>, false>(true));
        assert.ok(isXEqualToY<IsArray<number[]>, true>(true));
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

        assert.ok(isXExtendsOfY<string | number | symbol | boolean, LikeString>(true));
        assert.ok(isXExtendsOfY<typeof likeString, LikeString>(true));
        assert.equal(isXEqualToY<null, LikeString>(false), false);
        assert.equal(isXEqualToY<undefined, LikeString>(false), false);
        assert.equal(isXExtendsOfY<typeof likeNotString, LikeString>(false), false);
    });
});
