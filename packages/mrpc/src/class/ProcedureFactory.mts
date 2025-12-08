import type z from "zod";
import type {ProcedureHandler} from "../interfaces.mts";
import type {Contract} from "./Contract.mts";
import {Procedure} from "./Procedure.mts";

export class ProcedureFactory<TContext, TIn extends z.ZodType, TOut extends z.ZodType> {
    readonly #contract: Contract<TIn, TOut>;

    constructor(contract: Contract<TIn, TOut>) {
        this.#contract = contract;
    }

    public handle(handler: ProcedureHandler<TContext, TIn, TOut>) {
        const contract = this.#contract;

        return new Procedure(contract, handler);
    }
}
