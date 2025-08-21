import {expect, test} from "bun:test";
import {describe} from "node:test";
import {isXEqualToY, isXExtendsOfY, isXHasNull, isXHasUndefined} from "./test.mts";

describe("test", () => {
    test("isXEqualToY<X, Y>(equal: Equal<X, Y>)", async () => {
        expect(isXEqualToY<1, 1>(true)).toBeTrue();
        expect(isXEqualToY<1, 2>(false)).toBeFalse();

        // @ts-expect-error
        expect(isXEqualToY<1, 1>(false)).toBeFalse();

        // @ts-expect-error
        expect(isXEqualToY<1, 2>(true)).toBeTrue();
    });

    test("isXExtendsOfY<X, Y>(equal: Extends<X, Y>)", async () => {
        expect(isXExtendsOfY<1, 1>(true)).toBeTrue();
        expect(isXExtendsOfY<{}, {}>(true)).toBeTrue();
        expect(isXExtendsOfY<{a: 1}, {}>(true)).toBeTrue();
        expect(isXExtendsOfY<{a: 1; b: 2}, {b: false}>(false)).toBeFalse();

        // @ts-expect-error
        expect(isXExtendsOfY<1, 1>(false)).toBeFalse();
    });

    test("isXHasNull<X>(equal: HasNull<X>)", async () => {
        expect(isXHasNull<1>(false)).toBeFalse();
        expect(isXHasNull<1 | undefined>(false)).toBeFalse();
        expect(isXHasNull<1 | null>(true)).toBeTrue();

        // @ts-expect-error
        expect(isXHasNull<1 | null>(false)).toBeFalse();
    });

    test("isXHasUndefined<X>(equal: HasUndefined<X>)", async () => {
        expect(isXHasUndefined<1>(false)).toBeFalse();
        expect(isXHasUndefined<1 | null>(false)).toBeFalse();
        expect(isXHasUndefined<1 | undefined>(true)).toBeTrue();
    });
});
