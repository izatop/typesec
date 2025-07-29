import type {Equal, Extends, HasNull, HasUndefined} from "./type.mjs";

export function isXEqualToY<X, Y>(equal: Equal<X, Y>): boolean {
    return equal;
}

export function isXExtendsOfY<X, Y>(equal: Extends<X, Y>): boolean {
    return equal;
}

export function isXHasNull<X>(equals: HasNull<X>) {
    return equals;
}

export function isXHasUndefined<X>(equals: HasUndefined<X>) {
    return equals;
}
