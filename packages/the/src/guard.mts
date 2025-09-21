import type {Guard} from "./type.mts";

export function make<T>(validator: (value: unknown) => boolean): Guard<T> {
    return (value): value is T => validator(value);
}

export const guard = {
    make,
};
