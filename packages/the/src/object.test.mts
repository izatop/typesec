import {describe, expect, test} from "bun:test";
import {
    drop,
    fromAsyncEntries,
    fromEntries,
    has,
    hasKeyListOf,
    hasKeyOf,
    identify,
    isNull,
    isObject,
    keys,
    override,
    prop,
    toEntries,
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

    test("drop", () => {
        expect(drop({a: 1, b: 2, c: 3}, 2)).toEqual({a: 1, c: 3});
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
    });

    test("overwrite", () => {
        expect(keys({a: 1})).toEqual(["a"]);
    });
});
