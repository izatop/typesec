export class RefinementError extends Error {
    public override readonly name = "RefinementError";
}

export type TransitionErrorCode =
    | "INVALID_DEFINITION"
    | "STATE_NOT_FOUND"
    | "STATE_AMBIGUOUS"
    | "TRANSITION_NOT_ALLOWED";

export class TransitionError extends Error {
    public override readonly name = "TransitionError";

    constructor(
        public readonly code: TransitionErrorCode,
        message: string,
        options?: ErrorOptions,
    ) {
        super(message, options);
    }
}
