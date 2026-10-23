/**
 * Raised when a value fails a `refine` pattern or predicate.
 * @category pipeline
 */
export class RefinementError extends Error {
    /** Stable error name, so a handler can recognise the failure. */
    public override readonly name = "RefinementError";
}

/**
 * Why a transition failed, as a stable code.
 * @category state
 */
export type TransitionErrorCode =
    | "INVALID_DEFINITION"
    | "STATE_NOT_FOUND"
    | "STATE_AMBIGUOUS"
    | "TRANSITION_NOT_ALLOWED";

/**
 * Raised on an invalid definition, an unresolvable state, or a move the graph forbids.
 * @category state
 */
export class TransitionError extends Error {
    /** Stable error name, so a handler can recognise the failure. */
    public override readonly name = "TransitionError";

    constructor(
        /** Why the transition failed, as a stable code a handler can branch on. */
        public readonly code: TransitionErrorCode,
        message: string,
        options?: ErrorOptions,
    ) {
        super(message, options);
    }
}
