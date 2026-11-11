import {AssertionException, ValidationException} from "./errors.mjs";
import {defnify} from "./fn.mjs";

export {AssertionException};

/**
 * Compatibility alias for `AssertionException`.
 * @deprecated Use `AssertionException`; its name is `AssertionException`.
 * @category assert
 */
export {AssertionException as AssertionError};

/**
 * A failure message, a concrete exception, or a factory evaluated only when an assertion fails.
 * @category assert
 */
export type AssertionReason = string | Error | (() => Error);

/**
 * A truthiness assertion with a validation variant; both narrow the checked value.
 * @category assert
 */
export type Assert = {
    (value: unknown, reason: AssertionReason): asserts value;
    /** Throws ValidationException for a string reason, preserving explicit exceptions and factories. */
    validate(value: unknown, reason: AssertionReason): asserts value;
};

/**
 * Narrows a truthy value or throws AssertionException for a message, preserving explicit exceptions.
 * Factories run once on failure; assert.validate uses ValidationException for string reasons.
 * @category assert
 * @example assert(connection, "Connection must be initialized");
 */
export const assert: Assert = Object.assign(
    function assert(value: unknown, reason: AssertionReason): asserts value {
        if (value) {
            return;
        }

        const failure = defnify(reason);

        throw typeof failure === "string" ? new AssertionException(failure) : failure;
    },
    {
        /** Narrows valid input, preserving explicit exceptions and evaluating factories only on failure. */
        validate(value: unknown, reason: AssertionReason): asserts value {
            if (value) {
                return;
            }

            const failure = defnify(reason);

            throw typeof failure === "string" ? new ValidationException(failure) : failure;
        },
    },
);
