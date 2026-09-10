import type {Equal, Extends, HasNull, HasUndefined} from "./type.mjs";

/**
 * Compile-time assertion that two types are identical.
 *
 * The check happens when the file typechecks; the returned boolean only carries it into a runtime expectation.
 * @category testing
 * @example expect(isXEqualToY<A, B>(true)).toBeTrue();
 */
export function isXEqualToY<X, Y>(equal: Equal<X, Y>): boolean {
    return equal;
}

/**
 * Compile-time assertion that `X` is assignable to `Y`.
 * @category testing
 * @example expect(isXExtendsOfY<A, B>(true)).toBeTrue();
 */
export function isXExtendsOfY<X, Y>(equal: Extends<X, Y>): boolean {
    return equal;
}

/**
 * Compile-time assertion that `X` admits `null`.
 * @category testing
 */
export function isXHasNull<X>(equals: HasNull<X>) {
    return equals;
}

/**
 * Compile-time assertion that `X` admits `undefined`.
 * @category testing
 */
export function isXHasUndefined<X>(equals: HasUndefined<X>) {
    return equals;
}
