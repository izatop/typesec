import {AssertionError} from "node:assert";

/**
 * Throws unless the value is truthy, and narrows it for the code that follows.
 * @category assert
 * @deprecated use `assert` from `@typesec/the/assert`, which does not depend on `node:assert`
 */
export function assert(value: unknown, message: string | Error): asserts value {
    if (value) {
        return;
    }

    throw new AssertionError({
        message: message instanceof Error ? message.message : message,
        stackStartFn: assert,
    });
}
