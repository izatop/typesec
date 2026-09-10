import {ServeError} from "../proto/ServeError.mjs";

/**
 * Throws `ServeError` with the given status unless the value is truthy, and narrows it.
 * @category http
 * @example assert(user, "Not found", 404)
 */
export function assert(value: unknown, message?: string, code?: number): asserts value {
    if (!value) {
        throw new ServeError(message, code);
    }
}
