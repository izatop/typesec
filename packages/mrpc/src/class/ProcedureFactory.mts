import {async} from "@typesec/the/async";
import type z from "zod";
import type {ProcedureHandler} from "../interfaces.mts";
import type {ZodSubscription} from "../subscription.mts";
import type {Contract} from "./Contract.mts";
import {ProcedureAsync} from "./ProcedureAsync.mts";
import {ProcedureAsyncGenerator} from "./ProcedureAsyncGenerator.mts";
import {ProcedureSync} from "./ProcedureSync.mts";

export class ProcedureFactory<TContext, TIn extends z.ZodType, TOut extends z.ZodType> {
    readonly #contract: Contract<TIn, TOut>;

    constructor(contract: Contract<TIn, TOut>) {
        this.#contract = contract;
    }

    public create<TSubOut extends z.ZodType, TSub extends ZodSubscription<TSubOut>>(
        this: ProcedureFactory<TContext, TIn, TSub>,
        handler: ProcedureHandler<TContext, TIn, z.output<TSubOut>>,
    ): ProcedureAsyncGenerator<TContext, TIn, TSubOut, TSub>;
    public create(
        handler: ProcedureHandler<TContext, TIn, Promise<z.output<TOut>>>,
    ): ProcedureAsync<TContext, TIn, TOut>;
    public create(handler: ProcedureHandler<TContext, TIn, z.output<TOut>>): ProcedureSync<TContext, TIn, TOut>;
    public create(this: ProcedureFactory<TContext, TIn, any>, handler: ProcedureHandler<TContext, TIn, any>): any {
        const contract = this.#contract;
        if (async.isAsyncGeneratorFunction(handler)) {
            return new ProcedureAsyncGenerator(contract, handler);
        }

        return async.isAsyncFunction(handler)
            ? new ProcedureAsync(contract, handler)
            : new ProcedureSync(contract, handler);
    }
}
