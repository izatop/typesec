import type z from "zod";
import type {Contract} from "./class/Contract.mts";
import {Procedure} from "./class/Procedure.mts";
import {ProcedureFactory} from "./class/ProcedureFactory.mts";
import type {ProcedureHandler} from "./interfaces.mts";

export function procedure<TContext, TInput extends z.ZodType, TOutput extends z.ZodType>(
    contract: Contract<TInput, TOutput>,
): ProcedureFactory<TContext, TInput, TOutput>;
export function procedure<TContext, TInput extends z.ZodType, TOutput extends z.ZodType>(
    contract: Contract<TInput, TOutput>,
    handle: ProcedureHandler<TContext, TInput, TOutput>,
): Procedure<TContext, TInput, TOutput>;
export function procedure<TContext, TInput extends z.ZodType, TOutput extends z.ZodType>(
    contract: Contract<TInput, TOutput>,
    handle?: ProcedureHandler<TContext, TInput, TOutput>,
): Procedure<TContext, TInput, TOutput> | ProcedureFactory<TContext, TInput, TOutput> {
    return handle ? new Procedure(contract, handle) : new ProcedureFactory(contract);
}
