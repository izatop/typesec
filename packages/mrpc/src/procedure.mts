import {fn} from "@typesec/the";
import type z from "zod";
import type {Contract} from "./class/Contract.mts";
import type {ProcedureAbstract} from "./class/ProcedureAbstract.mts";
import {ProcedureAsync} from "./class/ProcedureAsync.mts";
import {ProcedureFactory} from "./class/ProcedureFactory.mts";
import type {ProcedureSync} from "./class/ProcedureSync.mts";
import type {ProcedureAsyncGenerator, ZodSubscription} from "./index.mts";
import type {ProcedureHandler} from "./interfaces.mts";

export type ContextualProcedure<TContext> = {
    <TIn extends z.ZodType, TOut extends z.ZodType>(
        contract: Contract<TIn, TOut>,
    ): ProcedureFactory<TContext, TIn, TOut>;
    <TIn extends z.ZodType, TOut extends z.ZodType, TSub extends ZodSubscription<TOut>>(
        contract: Contract<TIn, TSub>,
        handle: ProcedureHandler<TContext, TIn, AsyncIteratorObject<z.input<TOut>>>,
    ): ProcedureAsyncGenerator<TContext, TIn, TOut, TSub>;
    <TIn extends z.ZodType, TOut extends z.ZodType>(
        contract: Contract<TIn, TOut>,
        handle: ProcedureHandler<TContext, TIn, Promise<z.output<TOut>>>,
    ): ProcedureAsync<TContext, TIn, TOut>;
    <TIn extends z.ZodType, TOut extends z.ZodType>(
        contract: Contract<TIn, TOut>,
        handle: ProcedureHandler<TContext, TIn, z.output<TOut>>,
    ): ProcedureSync<TContext, TIn, TOut>;
};

function producer<TContext, TIn extends z.ZodType, TOut extends z.ZodType>(
    contract: Contract<TIn, TOut>,
): ProcedureFactory<TContext, TIn, TOut>;
function producer<TContext, TIn extends z.ZodType, TOut extends z.ZodType, TSub extends ZodSubscription<TOut>>(
    contract: Contract<TIn, TSub>,
    handle: ProcedureHandler<TContext, TIn, AsyncIteratorObject<z.input<TOut>>>,
): ProcedureAsyncGenerator<TContext, TIn, TOut, TSub>;
function producer<TContext, TIn extends z.ZodType, TOut extends z.ZodType>(
    contract: Contract<TIn, TOut>,
    handle: ProcedureHandler<TContext, TIn, Promise<z.output<TOut>>>,
): ProcedureAsync<TContext, TIn, TOut>;
function producer<TContext, TIn extends z.ZodType, TOut extends z.ZodType>(
    contract: Contract<TIn, TOut>,
    handle: ProcedureHandler<TContext, TIn, z.output<TOut>>,
): ProcedureSync<TContext, TIn, TOut>;
function producer(
    contract: Contract<any, any>,
    handle?: ProcedureHandler<any, any, any>,
): ProcedureAbstract<any, any, any, any, any> | ProcedureFactory<any, any, any> {
    if (fn.is(handle, "function")) {
        const factory = new ProcedureFactory(contract);

        return factory.create(handle);
    }

    return new ProcedureFactory(contract);
}

function contextual<TContext>(): ContextualProcedure<TContext> {
    return producer;
}

export type ProcedureProducer = typeof producer & {
    contextual: <TContext>() => ContextualProcedure<TContext>;
};

const procedure: ProcedureProducer = Object.assign(producer, {contextual});

export {procedure};
