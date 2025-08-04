import {describe, expect, test} from "bun:test";
import {fromEntries, identify, toEntries} from "./object.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("number", () => {
    test("is", () => {
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
});
