export class ServeError extends Error {
    public readonly code: number;

    constructor(message = "Internal Server Error", code = 500) {
        super(message);
        this.code = code;
    }
}
