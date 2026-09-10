import {fn} from "@typesec/the/fn";
import type {Promisify} from "@typesec/the/type";
import type z from "zod";
import type {Contract} from "./class/Contract.mjs";
import type {ProcedureAbstract} from "./class/ProcedureAbstract.mjs";
import {ProcedureAsync} from "./class/ProcedureAsync.mjs";
import {ProcedureFactory} from "./class/ProcedureFactory.mjs";
import type {ProcedureSync} from "./class/ProcedureSync.mjs";
import type {ProcedureAsyncGenerator, ZodSubscription} from "./index.mjs";
import type {ProcedureHandler} from "./interfaces.mjs";

/**
 * Middleware that turns one context into the next.
 * @category rpc
 */
export type UseContextFn<TContext, TNextContext> = (context: TContext) => Promisify<TNextContext>;

/**
 * Builds procedures over one context type; the overload chosen depends on what the handler returns.
 * @category rpc
 */
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

/**
 * Starts a procedure builder over a new context.
 * @category rpc
 */
export type Use<TContext> = {
    <TNextContext>(): ProcedureProducer<TNextContext>;
    <TNextContext>(fn: UseContextFn<TContext, TNextContext>): ProcedureProducer<TNextContext>;
};

/**
 * The context controls a procedure builder carries.
 * @category rpc
 */
export type ProcedureProducerParams<TContext> = {
    /**
     * @deprecated Use `use` instead.
     */
    contextual: <TContext>() => ProcedureProducer<TContext>;
    use: Use<TContext>;
};

/**
 * A procedure builder bound to a context type.
 * @category rpc
 */
export type ProcedureProducer<TContext> = ContextualProcedure<TContext> & ProcedureProducerParams<TContext>;

function use(): typeof producer & ProcedureProducerParams<unknown>;
function use<TContext, TNextContext>(fn: UseContextFn<TContext, TNextContext>): ProcedureProducer<TNextContext>;
function use<TContext, TNextContext>(
    fn?: UseContextFn<TContext, TNextContext>,
): ProcedureProducer<TContext | TNextContext> {
    const params = {contextual: use, use} as unknown as ProcedureProducerParams<TContext | TNextContext>;

    if (fn) {
        const middleware = (contract: Contract<any, any>, handle?: ProcedureHandler<TNextContext, any, any>) => {
            const factory = producer<TContext, any, any>(contract).use(fn);

            return handle ? factory.create(handle) : factory;
        };

        return Object.assign(middleware, params) as ProcedureProducer<TContext | TNextContext>;
    }

    return Object.assign(producer, params);
}

const procedure = use();

/**
 * Builds a procedure from a contract and its handler.
 *
 * The handler's return type picks the kind: a value gives a synchronous procedure, a promise an async one, and an async generator a subscription. Called without a handler it returns a factory, so `use` can add context middleware first.
 * @category rpc
 * @example procedure(StringCountContract, ({input}) => input.length)
 */
export {procedure};
