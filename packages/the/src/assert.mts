import {AssertionError} from "node:assert";

export function assert(value: unknown, message: string | Error): asserts value {
    if (value) {
        return;
    }

    const err = new AssertionError({
        message: message instanceof Error ? message.message : message,
        stackStartFn: assert,
    });

    Error.captureStackTrace(err);

    throw err;
}
