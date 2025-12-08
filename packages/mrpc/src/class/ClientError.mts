import type {ProtocolErrorIssue, ProtocolErrorReason} from "../interfaces.mts";

export class ClientError extends Error {
    readonly #code: number;
    readonly #reason: ProtocolErrorReason;

    constructor(code: number, reason: ProtocolErrorReason) {
        super(reason.message);

        this.#code = code;
        this.#reason = reason;
    }

    public get code(): number {
        return this.#code;
    }

    public get issues(): ProtocolErrorIssue[] {
        return this.#reason.issues;
    }
}
