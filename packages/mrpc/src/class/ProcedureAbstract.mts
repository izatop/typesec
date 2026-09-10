import z from "zod";
import type {ProcedureHandler} from "../interfaces.mjs";
import type {Contract} from "./Contract.mjs";

/**
 * Base of every procedure: it holds a contract and the handler that answers it.
 *
 * `run` returns the value in process, `encode` also passes it through the output schema for a transport.
 * @category rpc
 */
export abstract class ProcedureAbstract<TContext, TIn extends z.ZodType, TOut extends z.ZodType, TRet, TRetEncoded> {
    readonly #contract: Contract<TIn, TOut>;
    readonly #handler: ProcedureHandler<TContext, TIn, TRet>;

    constructor(contract: Contract<TIn, TOut>, handler: ProcedureHandler<TContext, TIn, TRet>) {
        this.#contract = contract;
        this.#handler = handler;
    }

    protected get contract() {
        return this.#contract;
    }

    protected get handler() {
        return this.#handler;
    }

    /** Validates raw input, runs the handler, and encodes the result for the wire. */
    public abstract encode(context: TContext, raw: unknown): TRetEncoded;

    /** Runs the handler over already-validated input. */
    public abstract run(context: TContext, input: z.output<TIn>): TRet;
}
