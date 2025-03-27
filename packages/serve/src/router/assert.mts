import {ServeError} from "../proto/ServeError.mjs";

export function assert(value: unknown, message?: string, code?: number): asserts value {
    if (!value) {
        throw new ServeError(message, code);
    }
}
