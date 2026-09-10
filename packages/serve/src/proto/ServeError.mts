/**
 * An error carrying an HTTP status, which the protocol turns into that response instead of a 500.
 * @category http
 */
export class ServeError extends Error {
    /** The HTTP status to answer with. */
    public readonly code: number;

    constructor(message = "Internal Server Error", code = 500, options?: ErrorOptions) {
        super(message, options);
        this.code = code;
    }
}
