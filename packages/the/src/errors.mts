/**
 * Base exception for framework and application failures on both client and server.
 * Subclasses without a specific transport mapping use the generic failure fallback.
 * @category exception
 */
export class ApplicationException extends Error {
    /** Creates an exception with the native message and cause options. */
    public constructor(message?: string, options?: ErrorOptions) {
        super(message, options);

        this.name = new.target.name;
    }
}

/**
 * Raised when input does not satisfy an application's validation rules.
 * @category exception
 */
export class ValidationException extends ApplicationException {}

/**
 * Raised when a requested resource does not exist, without prescribing an HTTP or RPC status.
 * Missing required configuration is an application failure, not necessarily a missing requested resource.
 * @category exception
 */
export class NotFoundException extends ApplicationException {}

/**
 * Raised when an internal invariant does not hold.
 * @category exception
 */
export class AssertionException extends ApplicationException {
    /** Stable code retained for assertion handlers. */
    public readonly code = "ERR_ASSERTION";
}
