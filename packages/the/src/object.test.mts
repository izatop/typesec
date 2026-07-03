import {describe, expect, test} from "bun:test";
import {
    assign,
    drop,
    fromAsyncEntries,
    fromEntries,
    has,
    hasKeyListOf,
    hasKeyOf,
    identify,
    isNull,
    isObject,
    key,
    keys,
    object,
    omit,
    override,
    prop,
    reverseEntries,
    toEntries,
    values,
} from "./object.mjs";

describe("Object", () => {
    test("prop", () => {
        const data = {foo: 1, bar: 2};

        expect(prop(data, "foo")).toBe(1);
        expect(prop(data, "bar")).toBe(2);
    });

    test("identify", () => {
        expect(identify({id: "foo"})).toBe("foo");
        expect(identify({name: "foo"})).toBe("foo");
        expect(identify(class Foo {})).toBe("Foo");
        expect(identify(new (class Baz {})())).toBe("Baz");
        expect(identify("bar")).toBe("bar");
        expect(identify("")).toBe("anonymous");
        expect(identify(undefined, "fallback")).toBe("fallback");
    });

    test("toEntries", () => {
        const actual = toEntries({a: 1, b: 2});

        expect(actual).toEqual([
            ["a", 1],
            ["b", 2],
        ]);
    });

    test("fromEntries", () => {
        const actual = fromEntries([
            ["a", 1],
            ["b", 2],
        ]);

        expect(actual).toEqual({a: 1, b: 2});
    });

    test("reverseEntries", () => {
        const actual = reverseEntries<{a: number; b: number}>([
            ["a", 1],
            ["b", 2],
        ]);

        expect(actual).toEqual({a: 1, b: 2});
    });

    test("fromAsyncEntries", async () => {
        const actual = await fromAsyncEntries([
            ["a", Promise.resolve(1)],
            ["b", Promise.resolve(2)],
        ]);

        expect(actual).toEqual({a: 1, b: 2});
    });

    test("override", () => {
        expect(override({a: 1}, {a: 2})).toEqual({a: 2});
    });

    test("assign", () => {
        const target = {a: 1, b: 2};
        assign(target, {b: 3});

        expect(target).toEqual({a: 1, b: 3});
    });

    test("drop", () => {
        expect(drop({a: 1, b: 2, c: 3}, 2)).toEqual({a: 1, c: 3});
    });

    test("omit", () => {
        expect(omit({a: 1, b: 2, c: 3}, "b", "c")).toEqual({a: 1});
    });

    test("isNull", () => {
        expect(isNull(null)).toBeTrue();
        expect(isNull({})).toBeFalse();
    });

    test("isObject", () => {
        expect(isObject({})).toBeTrue();
        expect(isObject(1)).toBeFalse();
        expect(isObject([])).toBeFalse();
        expect(isObject(false)).toBeFalse();
        expect(isObject(true)).toBeFalse();
        expect(isObject("str")).toBeFalse();
    });

    test("has", () => {
        expect(has({a: 1}, "a")).toBeTrue();
        expect(has({a: 1}, "b")).toBeFalse();
        expect(has({a: 1, b: 2}, "a", "b")).toBeTrue();
        expect(has({a: 1, b: 2}, "a", "c")).toBeFalse();
    });

    test("key", () => {
        expect(key({a: 1}, "a")).toBe("a");
        expect(() => key({a: 1}, "b" as any)).toThrow("Unknown key b in Object");
    });

    test("hasKeyOf", () => {
        expect(hasKeyOf({a: 1}, "a")).toBeTrue();
        expect(hasKeyOf({a: 1}, "b")).toBeFalse();
    });

    test("hasKeyOfList", () => {
        expect(hasKeyListOf({a: 1, b: 1}, ["a", "b"])).toBeTrue();
        expect(hasKeyListOf({a: 1}, ["b"])).toBeFalse();
    });

    test("keys", () => {
        expect(keys({a: 1})).toEqual(["a"]);
        const sym = Symbol("s");
        const data = {[sym]: 1, a: 2};
        expect(keys(data, "string")).toEqual(["a"]);
        expect(keys(data, "symbol")).toEqual([sym]);
    });

    test("values", () => {
        expect(values({a: 1, b: 2})).toEqual([1, 2]);
    });

    test("object.isPlain", () => {
        expect(object.isPlain({})).toBeTrue();
        expect(object.isPlain(Object.create(null))).toBeTrue();
        expect(object.isPlain([])).toBeFalse();
        expect(object.isPlain(new (class Foo {})())).toBeFalse();
    });
});
