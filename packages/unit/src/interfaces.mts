import type {Fn, Fnify, Promisify} from "@typesec/the";

export interface IProto<TIn> {
    input: TIn;
}

export type MainArgs = {
    path: string;
};

export type Proto<T extends IProto<TIn>, TIn, TRet> = {
    new (input: TIn): T;
    run(args: MainArgs): Promise<void>;
    validate(value: unknown): value is TRet;
};

export type ContextFactory<TContext> = Fnify<Promisify<TContext>>;

export type Meta = {
    name: string;
    description?: string;
};

export type WithMeta<T> = T & {meta: Meta};

export type SetupOptions<TContext, TProto extends IProto<TIn>, TIn, TRet> = Meta & {
    proto: Proto<TProto, TIn, TRet>;
    context: ContextFactory<TContext>;
};

export type HandleArgs<TContext, TProto extends IProto<TIn>, TIn> = {
    request: TIn;
    context: TContext;
    proto: TProto;
};

export type Handle<TContext, TProto extends IProto<TIn>, TIn, TRet> = (
    args: HandleArgs<TContext, TProto, TIn>,
) => Promisify<TRet>;

export type HandleEntry<TIn, TRet> = WithMeta<Fn<[TIn], Promisify<TRet>>> & {
    proto: Proto<IProto<TIn>, TIn, TRet>;
};

export type FactoryArgs<TContext, TProto extends IProto<TIn>, TIn, TRet> = Meta & {
    handle: Handle<TContext, TProto, TIn, TRet>;
};

export type Factory<TContext, TProto extends IProto<TIn>, TIn, TRet> = (
    args: FactoryArgs<TContext, TProto, TIn, TRet>,
) => HandleEntry<TIn, TRet>;

export type Application<TContext, TProto extends IProto<TIn>, TIn, TRet> = WithMeta<
    Factory<TContext, TProto, TIn, TRet> & {
        proto: Proto<TProto, TIn, TRet>;
        context: ContextFactory<TContext>;
    }
>;
