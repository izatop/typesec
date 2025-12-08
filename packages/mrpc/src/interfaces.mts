import type {KeyOf, Promisify, Rec} from "@typesec/the";
import z from "zod";
import type {Backend} from "./class/Backend.mts";
import type {Contract} from "./class/Contract.mts";
import type {Procedure} from "./class/Procedure.mts";

export type ContractDomain<TIn extends z.ZodType, TOut extends z.ZodType> = {
    input: TIn;
    output: TOut;
};

export type ProcedureHandlerArgs<TContext, TIn> = {
    context: TContext;
    input: z.output<TIn>;
};

export type ProcedureHandler<TContext, TIn extends z.ZodType, TOut extends z.ZodType> = (
    input: ProcedureHandlerArgs<TContext, TIn>,
) => Promisify<z.output<TOut>>;

export type Domain<N extends string, T extends Rec<string, unknown>> = {
    name: N;
    root: T;
};

export namespace Domain {
    export type Infer<T extends Domain<any, any>> = T extends Domain<any, infer R> ? R : never;
}

export type Implementation<TContext, T extends Rec<string, unknown>> = {
    [K in KeyOf<T, string>]: T[K] extends Contract<infer TIn, infer TOut>
        ? Procedure<TContext, TIn, TOut>
        : T[K] extends Rec<string, any>
          ? Implementation<TContext, T[K]>
          : never;
};

export type StaticHandler<TIn, TOut> = (input: z.output<TIn>) => Promisify<z.output<TOut>>;

export type StaticResolvers<T extends Rec<string, unknown>> = {
    [K in KeyOf<T, string>]: T[K] extends Procedure<any, infer TIn, infer TOut>
        ? StaticHandler<TIn, TOut>
        : T[K] extends Rec
          ? StaticResolvers<T[K]>
          : never;
};

export type ContextualBackend<TContext> = {
    <TDomain extends Domain<any, any>>(
        domain: TDomain,
        impl: Implementation<TContext, Domain.Infer<TDomain>>,
    ): Backend<TContext, TDomain, Implementation<TContext, Domain.Infer<TDomain>>>;
};

export type ProtocolRequest = {
    query: unknown;
};

export type ProtocolErrorIssue = {
    message: string;
    path?: string;
};

export type ProtocolErrorReason = {
    message: string;
    issues: ProtocolErrorIssue[];
};

export type ProtocolResponse = {
    data: Rec | null;
    reason?: ProtocolErrorReason;
    code: number;
    debug?: unknown;
};

export interface IClientProtocol {
    query(request: ProtocolRequest): Promise<ProtocolResponse>;
    subscribe?: (id: string) => AsyncIterable<unknown>;
}
