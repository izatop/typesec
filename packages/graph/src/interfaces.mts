import {
    type Arrayify,
    type DeArrayify,
    type DeFnify,
    type Equal,
    type Expand,
    type Fn,
    type Fnify,
    type HasNull,
    type IsAny,
    type IsNever,
    type KeyOf,
    type Nullable,
    type Promisify,
    type Rec,
    type Recify,
} from "@typesec/the";
import type {Subquery} from "./query/Subquery.mts";

export type Base<T extends Rec<string>, A extends boolean = any> = {
    [K in KeyOf<T, string>]: Exclude<Graph.Validate<T[K], A>, undefined>;
};

export type Graph<T extends Graph.RecStrict> = Base<T, true>;

export type Args<T extends Graph.RecStrictArgs> = Base<T, false>;

export type Node<T, A extends Args<any> = never> = (args: A) => T;

export namespace Graph {
    export type RecursiveType = "self";
    export type Primitive = string | number | boolean;

    export type Any<T> = Nullable<Arrayify<Nullable<T>>>;
    export type NodeAny<T = any> = Node<T, any> | Node<T, never>;

    export type Value = Any<Primitive> | NodeAny;
    export type ValueArgs = Any<Primitive> | Node<any, never>;
    export type RecStrict = Rec<string, Value>;
    export type RecStrictArgs = Rec<string, Value>;

    export type Infer<G> = G extends Base<infer T> ? T : never;

    export type Validate<T, A extends boolean = true> =
        Equal<A, false> extends true ? ValidateArgs<T> : [T] extends [Value] ? T : never;

    export type ValidateArgs<T> = [T] extends [ValueArgs]
        ? T extends Node<any, infer N>
            ? IsNever<N> extends true
                ? T
                : never
            : T
        : never;

    export type Extract<G extends Base<any>> = {
        [K in KeyOf<G, string>]: ExtractNode<G[K]>;
    };

    export type ExtractNode<T> =
        T extends Array<infer A>
            ? ExtractNode<A>[]
            : T extends Primitive
              ? T
              : T extends NodeAny<infer V extends Base<infer _ extends RecStrict>>
                ? Expand<Extract<V>>
                : T extends NodeAny<infer V>
                  ? V
                  : never;

    export type ContextualFactory<C> = {
        <G extends Graph<any>, S extends Rec, ID extends string = string>(
            name: ID,
            members: Node.Make<G, S, C>,
        ): Proto.GraphNode<ID, G, S, C>;
    };
}

export namespace Node {
    type Proto = Proto.Any | Graph.RecursiveType;

    export type ScopeResolve<S extends Rec, C> = Fn<[ResolverContext<C>], Promisify<S>> | S;

    export type TypeAny<G extends Base<any> = any, S extends Rec = any, C = any> =
        IsAny<C> extends true
            ? IsNever<C> extends true
                ? Proto.GraphNode<any, G, S, never>
                : Proto.GraphNode<any, G, S, any>
            : Proto.GraphNode<any, G, S, C>;

    export type Make<G extends Base<any>, S extends Rec, C> = {
        [K in KeyOf<G, string>]: Equal<G, NonNullable<Unpack<G[K]>>> extends true
            ? Member<Graph.RecursiveType, G, K, S, C>
            : Member<Wrap<G[K], S, C>, G, K, S, C>;
    };

    export type MakeArgs<G extends Base<any>> = {
        [K in KeyOf<G, string>]: MemberType<WrapArgs<G[K]>>;
    };

    export type Wrap<T, S extends Rec = any, C = never> =
        HasNull<T> extends true
            ? Proto.NullishType<Wrap<NonNullable<T>, S, C>>
            : [T] extends [Graph.Primitive]
              ? Proto.Primitive<any, T>
              : T extends Array<infer I>
                ? Proto.ArrayType<Wrap<I, S, C>>
                : T extends Graph.NodeAny<infer V>
                  ? Wrap<V>
                  : T extends Graph<infer _ extends Graph.RecStrict>
                    ? TypeAny<T, S, C>
                    : Proto.Complex<any, T, any>;

    export type WrapArgs<T> =
        HasNull<T> extends true
            ? Proto.NullishType<WrapArgs<NonNullable<T>>>
            : [T] extends [Graph.Primitive]
              ? Proto.Primitive<any, T>
              : T extends Array<infer I>
                ? Proto.ArrayType<WrapArgs<I>>
                : T extends Graph.NodeAny<infer V>
                  ? WrapArgs<V>
                  : T extends Args<infer _ extends Graph.RecStrictArgs>
                    ? Proto.ArgsNode<any, T>
                    : Proto.Complex<any, T, any>;

    export type Unpack<T> = T extends Node<infer V> ? V : T;
    export type MemberType<P extends Proto> = {type: P};
    export type Member<
        P extends Proto,
        G extends Graph<any>,
        K extends KeyOf<G, string>,
        S extends Rec,
        C,
    > = MemberType<P> & MemberResolver<G, K, S, C> & MemberArgs<G, K>;

    export type MemberResolver<G extends Base<any>, K extends KeyOf<G, string>, S extends Rec, C> =
        Equal<Unpack<G[K]>, S[K]> extends true ? OptionalResolver<G, K, S, C> : Resolver<G, K, S, C>;

    export type Resolver<G extends Base<any>, K extends KeyOf<G, string>, S extends Rec, C> = {
        resolve: (args: ResolverArgs<G, K, S, C>) => Promisify<S[K]>;
    };

    export type OptionalResolver<G extends Base<any>, K extends KeyOf<G, string>, S extends Rec, C> = {
        resolve?: (args: ResolverArgs<G, K, S, C>) => Promisify<S[K]>;
    };

    export type MemberArgs<G extends Base<any>, K extends KeyOf<G, string>> =
        G[K] extends Node<any, infer A> ? (IsNever<A> extends true ? {} : {args: WrapArgs<A>}) : {};

    export type ResolverArgs<G extends Base<any>, K extends KeyOf<G, string>, S extends Rec, C> = {
        value: S[K];
        parent: S;
        subquery: Subquery<G, S, C>;
        args: ExtractArgs<G, K>;
    } & ResolverContext<C>;

    export type ExtractArgs<G extends Base<any>, K extends KeyOf<G, string>> =
        G[K] extends Node<any, infer A>
            ? A extends Args<infer _ extends Graph.RecStrict>
                ? Graph.Extract<A>
                : never
            : never;

    export type ResolverContext<C> = IsNever<C> extends false ? {context: C} : {};
}

export namespace Proto {
    export type Kind = "graph" | "args" | "complex" | "primitive" | "array" | "null";

    export type Type<ID extends string, T, K extends Kind> = {
        name: ID;
        kind: K;
        validate: (value: unknown) => value is T;
    };

    export type Any<T = any> = Type<any, T, any>;
    export type All =
        | Primitive<any, Graph.Primitive>
        | Complex<any, any, Graph.Primitive>
        | NullishType<Any>
        | ArrayType<Any>
        | GraphNode<any, any, any>
        | ArgsNode<any, any>;

    export type Infer<T> = T extends Any<infer E> ? E : never;

    export type Primitive<ID extends string, T extends Graph.Primitive> = Type<ID, T, "primitive">;

    export type Complex<ID extends string, T, O extends Graph.Primitive> = Type<ID, T, "complex"> & {
        format: Any<O>;
        serialize: Fn<[T], O>;
        deserialize: Fn<[O], T>;
    };

    export type Composite<T, C extends Proto.Any, K extends Kind> = Type<any, T, K> & {
        child: C;
    };

    export type NullishType<C extends Proto.Any<any>> = Composite<Nullable<Infer<C>>, C, "null">;
    export type ArrayType<C extends Proto.Any<any>> = Composite<Infer<C>[], C, "array">;

    export type Definition<
        ID extends string,
        G extends Base<any>,
        K extends "graph" | "args",
        M extends Rec,
    > = Proto.Type<ID, Graph.Infer<G>, K> & {
        members: M;
        keys(): KeyOf<M, string>[];
        has: (key: string) => key is KeyOf<M, string>;
    };

    export type GraphNode<ID extends string, G extends Graph<any>, S extends Rec, C = never> = Definition<
        ID,
        G,
        "graph",
        Node.Make<G, S, C>
    >;

    export type ArgsNode<ID extends string, A extends Args<any>> = Definition<ID, A, "args", Node.MakeArgs<A>>;

    export type Factory<T extends Any> = {
        readonly type: T;
        (): T;
    };
}

export type Query<G extends Graph<any>> = {
    [K in KeyOf<G, string>]?: Query.Field<G, K>;
};

export namespace Query {
    export type ReadDeny = 0 | false;
    export type ReadAllow = 1 | true;
    export type Read = Fnify<ReadDeny | ReadAllow>;

    export type Field<G extends Graph<any>, K extends KeyOf<G, string>> =
        G[K] extends Node<infer V, infer A> ? NodeField<DeArrayify<V>, A> : Read;

    export type NodeField<T, A extends Args<any>> =
        T extends Graph<infer _ extends Graph.RecStrict>
            ? Recify<GraphSelector<T, A>>
            : IsNever<A> extends true
              ? Read
              : Recify<ArgsSelector<A>>;

    export type Selector<G extends Graph<any>, A extends Args<any> = never> =
        | Read
        | ArgsSelector<A>
        | GraphSelector<G, A>;

    export type ArgsSelector<A extends Args<any>> = [args: A];
    export type GraphSelector<G extends Graph<any>, A extends Args<any> = never> =
        IsNever<A> extends true ? [query: Query<G>] : [query: Query<G>, args: A];

    export type Result2<G extends Graph<any>, Q extends Query<G>> = {
        [K in KeyOf<Q, string>]: DeFnify<Q[K]> extends ReadDeny
            ? null
            : G[K] extends Node<infer V, any>
              ? V extends Graph<infer _ extends Graph.RecStrict>
                  ? Q[K] extends [query: infer SQ extends Query<V>, ...any[]]
                      ? Result<V, SQ>
                      : never
                  : V
              : K extends KeyOf<Graph.Extract<G>, string>
                ? Graph.Extract<G>[K]
                : never;
    };

    export type Result<G extends Graph<any>, Q extends Query<G>> = {
        [K in KeyOf<Q, string>]: Q[K] extends Fnify<ReadDeny>
            ? null
            : K extends KeyOf<G, string>
              ? ResultNode<G, K, Q[K]>
              : never;
    };

    export type ResultNode<G extends Graph<any>, K extends KeyOf<G, string>, Q> =
        Q extends Fnify<ReadAllow>
            ? Graph.Extract<G>[K]
            : G[K] extends Graph.NodeAny<infer SG extends Arrayify<Graph<any>>>
              ? Q extends [infer SQ extends Query<DeArrayify<SG>>, ...any[]]
                  ? SG extends (infer AG extends Graph<any>)[]
                      ? Result<AG, SQ>[]
                      : Result<SG, SQ>
                  : Q extends Rec<infer SK>
                    ? {[AK in SK]: ResultNode<G, K, Q[AK]>}
                    : never
              : Q extends [infer _ extends Args<any>]
                ? Graph.Extract<G>[K]
                : never;
}
