import {fn} from "@typesec/the";
import type z from "zod";
import type {Contract} from "./class/Contract.mts";
import type {ProcedureAbstract} from "./class/ProcedureAbstract.mts";
import {ProcedureAsync} from "./class/ProcedureAsync.mts";
import {ProcedureAsyncGenerator} from "./class/ProcedureAsyncGenerator.mts";
import {ProcedureFactory} from "./class/ProcedureFactory.mts";
import type {ProcedureSync} from "./class/ProcedureSync.mts";
import type {ProcedureHandler} from "./interfaces.mts";
import type {ZodSubscription} from "./subscription.mts";

export function procedure<TContext, TIn extends z.ZodType, TOut extends z.ZodType>(
    contract: Contract<TIn, TOut>,
): ProcedureFactory<TContext, TIn, TOut>;
export function procedure<TContext, TIn extends z.ZodType, TOut extends z.ZodType, TSub extends ZodSubscription<TOut>>(
    contract: Contract<TIn, TSub>,
    handle: ProcedureHandler<TContext, TIn, z.output<TOut>>,
): ProcedureAsyncGenerator<TContext, TIn, TOut, TSub>;
export function procedure<TContext, TIn extends z.ZodType, TOut extends z.ZodType>(
    contract: Contract<TIn, TOut>,
    handle: ProcedureHandler<TContext, TIn, Promise<z.output<TOut>>>,
): ProcedureAsync<TContext, TIn, TOut>;
export function procedure<TContext, TIn extends z.ZodType, TOut extends z.ZodType>(
    contract: Contract<TIn, TOut>,
    handle: ProcedureHandler<TContext, TIn, z.output<TOut>>,
): ProcedureSync<TContext, TIn, TOut>;
export function procedure(
    contract: Contract<any, any>,
    handle?: ProcedureHandler<any, any, any>,
): ProcedureAbstract<any, any, any, any, any> | ProcedureFactory<any, any, any> {
    if (fn.is(handle, "function")) {
        const factory = new ProcedureFactory(contract);

        return factory.create(handle);
    }

    return new ProcedureFactory(contract);
}
