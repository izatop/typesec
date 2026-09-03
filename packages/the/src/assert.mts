export class AssertionError extends Error {
    public readonly code = "ERR_ASSERTION";

    public constructor(message: string) {
        super(message);
        this.name = "AssertionError";
    }
}

export function assert(value: unknown, message: string | Error): asserts value {
    if (value) {
        return;
    }

    throw new AssertionError(message instanceof Error ? message.message : message);
}
