import type {Guard} from "./type.mjs";

export function make<T>(validator: (value: unknown) => boolean): Guard<T> {
    return (value): value is T => validator(value);
}

export const guard = {
    make,
};
