import type {Guard} from "./type.mjs";

/**
 * Turns a boolean predicate into a type guard for `T`.
 * @category guard
 * @example const isUser = guard.make<User>((v) => typeof v === "object");
 */
export function make<T>(validator: (value: unknown) => boolean): Guard<T> {
    return (value): value is T => validator(value);
}

/**
 * Type guard construction.
 * @category guard
 */
export const guard = {
    make,
};
