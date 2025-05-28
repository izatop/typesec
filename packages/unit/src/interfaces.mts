import type {EnvModeType} from "@typesec/core";
import type {Fn, Fnify, Promisify} from "@typesec/the";
import type {ProtoAbstract} from "./ProtoAbstract.mjs";

export type MainArgs = {
    path: string;
    ready?: Fn<[], Promisify<void | AsyncDisposable | Disposable>>;
};

export type Proto<T extends ProtoAbstract<TIn>, TIn, TRet> = {
    new (input: TIn): T;
    run(args: MainArgs): Promise<void>;
    validate(value: unknown): value is TRet;
};

export type ContextFactory<TContext> = Fnify<Promisify<TContext>>;

export type Meta = {
    name: string;
    only?: EnvModeType;
    description?: string;
};

export type WithMeta<T> = T & {meta: Meta};

export type SetupOptions<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet> = Meta & {
    proto: Proto<TProto, TIn, TRet>;
    context: ContextFactory<TContext>;
};

export type HandleArgs<TContext, TProto extends ProtoAbstract<TIn>, TIn> = {
    request: TIn;
    context: TContext;
    proto: TProto;
};

export type Handle<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet> = (
    args: HandleArgs<TContext, TProto, TIn>,
) => Promisify<TRet>;

export type HandleEntry<TProto extends ProtoAbstract<TIn>, TIn, TRet> = WithMeta<Fn<[TIn], Promisify<TRet>>> & {
    proto: Proto<TProto, TIn, TRet>;
};

export type FactoryArgs<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet> = Meta & {
    handle: Handle<TContext, TProto, TIn, TRet>;
};

export type Factory<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet> = (
    args: FactoryArgs<TContext, TProto, TIn, TRet>,
) => HandleEntry<TProto, TIn, TRet>;

export type Application<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet> = WithMeta<
    Factory<TContext, TProto, TIn, TRet> & {
        proto: Proto<TProto, TIn, TRet>;
        context: ContextFactory<TContext>;
    }
>;
