/**
 * Thrown by `assert` when a condition does not hold. Carries the code `ERR_ASSERTION`.
 * @category assert
 */
export class AssertionError extends Error {
    /** Stable error code, so a handler can recognise an assertion failure without matching on the message. */
    public readonly code = "ERR_ASSERTION";

    public constructor(message: string) {
        super(message);
        this.name = "AssertionError";
    }
}

/**
 * Throws `AssertionError` unless the value is truthy, and narrows it for the code that follows.
 *
 * Runtime-neutral: it does not reach for `node:assert`, so it works in a browser too.
 * @category assert
 * @example assert(route, `Route "${path}" not found`);
 */
export function assert(value: unknown, message: string | Error): asserts value {
    if (value) {
        return;
    }

    throw new AssertionError(message instanceof Error ? message.message : message);
}
