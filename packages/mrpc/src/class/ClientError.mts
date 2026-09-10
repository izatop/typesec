import type {ProtocolErrorIssue, ProtocolErrorReason} from "../interfaces.mjs";

/**
 * A failure reported by the server, carrying its status code and validation issues.
 * @category rpc
 */
export class ClientError extends Error {
    readonly #code: number;
    readonly #reason: ProtocolErrorReason;

    constructor(code: number, reason: ProtocolErrorReason) {
        super(reason.message);

        this.#code = code;
        this.#reason = reason;
    }

    /** The status code the server answered with. */
    public get code(): number {
        return this.#code;
    }

    /** The validation issues behind the failure. */
    public get issues(): ProtocolErrorIssue[] {
        return this.#reason.issues;
    }
}
