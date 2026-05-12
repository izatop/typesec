import {async} from "@typesec/the/async";
import type z from "zod";
import type {ProcedureHandler} from "../interfaces.mjs";
import type {UseContextFn} from "../procedure.mjs";
import type {ZodSubscription} from "../subscription.mjs";
import type {Contract} from "./Contract.mjs";
import {ProcedureAsync} from "./ProcedureAsync.mjs";
import {ProcedureAsyncGenerator} from "./ProcedureAsyncGenerator.mjs";
import {ProcedureSync} from "./ProcedureSync.mjs";

export class ProcedureFactory<TContext, TIn extends z.ZodType, TOut extends z.ZodType> {
    readonly #contract: Contract<TIn, TOut>;

    readonly #use?: UseContextFn<any, TContext>;

    constructor(contract: Contract<TIn, TOut>, use?: UseContextFn<any, TContext>) {
        this.#contract = contract;
        this.#use = use;
    }

    public use<TNextContext>(fn: UseContextFn<TContext, TNextContext>): ProcedureFactory<TNextContext, TIn, TOut> {
        return new ProcedureFactory(this.#contract, fn);
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
        const use = this.#use;

        handler = use ? async (args) => handler({...args, context: await use(args.context)}) : handler;

        if (async.isAsyncGeneratorFunction(handler)) {
            return new ProcedureAsyncGenerator(contract, handler);
        }

        return async.isAsyncFunction(handler)
            ? new ProcedureAsync(contract, handler)
            : new ProcedureSync(contract, handler);
    }
}
