import z from "zod";
import type {ProcedureHandler} from "../interfaces.mjs";
import type {Contract} from "./Contract.mjs";

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

    public abstract encode(context: TContext, raw: unknown): TRetEncoded;

    public abstract run(context: TContext, input: z.output<TIn>): TRet;
}
