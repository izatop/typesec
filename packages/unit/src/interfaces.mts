import type {EnvModeType} from "@typesec/core";
import type {Fn, Fnify, Promisify} from "@typesec/the";
import type {ProtoAbstract} from "./ProtoAbstract.mjs";

/**
 * What a protocol receives to start: the directory to route from, and an optional readiness hook.
 * @category protocol
 */
export type MainArgs = {
    path: string;
    ready?: Fn<[], Promisify<void | AsyncDisposable | Disposable>>;
};

/**
 * A protocol class: constructible from a request, runnable, and able to validate its own response.
 * @category protocol
 */
export type Proto<T extends ProtoAbstract<TIn>, TIn, TRet> = {
    new (input: TIn): T;
    run(args: MainArgs): Promise<void>;
    validate(value: unknown): value is TRet;
};

/**
 * How an application's context is produced: a value, a promise, or a function returning either.
 * @category protocol
 */
export type ContextFactory<TContext> = Fnify<Promisify<TContext>>;

/**
 * Metadata carried by an application and by each of its handles.
 * @category protocol
 */
export type Meta = {
    name: string;
    only?: EnvModeType;
    description?: string;
};

/**
 * A value with metadata attached.
 * @category protocol
 */
export type WithMeta<T> = T & {meta: Meta};

/**
 * What `context` takes to build an application: a protocol, a context factory, and metadata.
 * @category protocol
 */
export type SetupOptions<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet> = Meta & {
    proto: Proto<TProto, TIn, TRet>;
    context: ContextFactory<TContext>;
};

/**
 * What a handler receives: the raw request, the resolved context, and the protocol instance.
 * @category protocol
 */
export type HandleArgs<TContext, TProto extends ProtoAbstract<TIn>, TIn> = {
    request: TIn;
    context: TContext;
    proto: TProto;
};

/**
 * A request handler for one entrypoint.
 * @category protocol
 */
export type Handle<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet> = (
    args: HandleArgs<TContext, TProto, TIn>,
) => Promisify<TRet>;

/**
 * The default export of an entrypoint file: a callable handle carrying its metadata and protocol.
 * @category protocol
 */
export type HandleEntry<TProto extends ProtoAbstract<TIn>, TIn, TRet> = WithMeta<Fn<[TIn], Promisify<TRet>>> & {
    proto: Proto<TProto, TIn, TRet>;
};

/**
 * What an application factory takes to produce one entrypoint.
 * @category protocol
 */
export type FactoryArgs<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet> = Meta & {
    handle: Handle<TContext, TProto, TIn, TRet>;
};

/**
 * Turns a handler plus metadata into an entrypoint.
 * @category protocol
 */
export type Factory<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet> = (
    args: FactoryArgs<TContext, TProto, TIn, TRet>,
) => HandleEntry<TProto, TIn, TRet>;

/**
 * The default export of an application file: a factory carrying its protocol and context.
 * @category protocol
 */
export type Application<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet> = WithMeta<
    Factory<TContext, TProto, TIn, TRet> & {
        proto: Proto<TProto, TIn, TRet>;
        context: ContextFactory<TContext>;
    }
>;
