import type {KeyOf, Rec} from "@typesec/the/type";
import z from "zod";
import type {Backend} from "./class/Backend.mjs";
import type {Contract} from "./class/Contract.mjs";
import type {ProcedureAbstract} from "./class/ProcedureAbstract.mjs";

/**
 * The input and output schemas a contract holds.
 * @category rpc
 */
export type ContractDomain<TIn extends z.ZodType, TOut extends z.ZodType> = {
    input: TIn;
    output: TOut;
};

/**
 * What a procedure handler receives: the caller's context and the validated input.
 * @category rpc
 */
export type ProcedureHandlerArgs<TContext, TIn> = {
    context: TContext;
    input: z.output<TIn>;
};

/**
 * The body of one procedure.
 * @category rpc
 */
export type ProcedureHandler<TContext, TIn extends z.ZodType, TRet> = (
    input: ProcedureHandlerArgs<TContext, TIn>,
) => TRet;

/**
 * A named tree of contracts, shared by the backend and the client.
 * @category rpc
 */
export type Domain<N extends string, T extends Rec<string, unknown>> = {
    name: N;
    root: T;
};

/**
 * Type helpers over a domain.
 * @category rpc
 */
export namespace Domain {
    /** The contract tree of a domain. */
    export type Infer<T extends Domain<any, any>> = T extends Domain<any, infer R> ? R : never;
}

/**
 * A procedure for every contract in a domain, mirroring its shape.
 * @category rpc
 */
export type Implementation<TContext, T extends Rec<string, unknown>> = {
    [K in KeyOf<T, string>]: T[K] extends Contract<infer TIn, infer TOut>
        ? ProcedureAbstract<TContext, TIn, TOut, any, any>
        : T[K] extends Rec<string, any>
          ? Implementation<TContext, T[K]>
          : never;
};

/**
 * A procedure bound to a context, callable as a plain function.
 * @category rpc
 */
export type StaticHandler<TIn, TOut> = (input: TIn) => TOut;

/**
 * An implementation with the context already bound, so procedures are called in process.
 * @category rpc
 */
export type StaticResolvers<T extends Rec<string, unknown>> = {
    [K in KeyOf<T, string>]: T[K] extends ProcedureAbstract<any, infer TIn, any, infer TOut, any>
        ? StaticHandler<z.output<TIn>, TOut>
        : T[K] extends Rec
          ? StaticResolvers<T[K]>
          : never;
};

/**
 * Builds backends that all share one context type.
 * @category rpc
 */
export type ContextualBackend<TContext> = {
    <TDomain extends Domain<any, any>, TImpl extends Implementation<TContext, Domain.Infer<TDomain>>>(
        domain: TDomain,
        impl: TImpl,
    ): Backend<TContext, TDomain, TImpl>;
};

/**
 * What a transport sends: one encoded query.
 * @category rpc
 */
export type ProtocolRequest = {
    query: unknown;
};

/**
 * One validation issue, with the path it applies to.
 * @category rpc
 */
export type ProtocolErrorIssue = {
    message: string;
    path?: string;
};

/**
 * Why a call failed: a message and the issues behind it.
 * @category rpc
 */
export type ProtocolErrorReason = {
    message: string;
    issues: ProtocolErrorIssue[];
};

/**
 * What a transport returns: encoded data, a status code, and a reason when it failed.
 * @category rpc
 */
export type ProtocolResponse = {
    data: Rec | null;
    reason?: ProtocolErrorReason;
    code: number;
    debug?: unknown;
};

/**
 * The transport a client speaks over.
 *
 * Implement it to move queries by something other than fetch; `subscribe` is optional and only needed for streaming procedures.
 * @category rpc
 */
export interface IClientProtocol {
    query(request: ProtocolRequest): Promise<ProtocolResponse>;
    subscribe?: (id: string) => AsyncIterable<unknown>;
}
