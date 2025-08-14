import {
    type Arrayify,
    type DeArrayify,
    type Equal,
    type Expand,
    type Fn,
    type Fnify,
    type HasNull,
    type IsNever,
    type KeyOf,
    type Nullable,
    type Promisify,
    type Rec,
    type Recify,
} from "@typesec/the";
import type {ToNullish} from "@typesec/the/type";
import type {Subquery} from "./query/Subquery.mts";

export type NodeKind = "args" | "graph";
export const NODE_KIND = Symbol();

export type Base<T extends Rec<string>, TK extends NodeKind = NodeKind> = {
    [K in KeyOf<T, string>]: Exclude<Graph.Validate<T[K], TK>, undefined>;
} & {[NODE_KIND]: TK};

export type Graph<T extends Graph.RecStrict> = Base<T, "graph">;

export type Args<T extends Graph.RecStrictArgs> = Base<T, "args">;

export type Node<T, A extends Args<any> = never> = (args: A) => T;

export namespace Graph {
    export type RecursiveType = "self";
    export type Primitive = string | number | boolean | null;

    export type Any<T> = Nullable<Arrayify<Nullable<T>>>;
    export type NodeAny<T = any> = Node<T, any> | Node<T, never>;

    export type Value = Any<Primitive> | NodeAny;
    export type ValueArgs = Any<Primitive> | Node<any, never>;
    export type RecStrict = Rec<string, Value>;
    export type RecStrictArgs = Rec<string, Value>;

    export type Infer<G> = G extends Base<infer T> ? T : never;

    export type Validate<T, K extends NodeKind = NodeKind> = K extends "args"
        ? ValidateArgs<T>
        : [T] extends [Value]
          ? T
          : never;

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
              : T extends NodeAny<infer V extends Base<any>>
                ? Expand<Extract<V>>
                : T extends NodeAny<infer V>
                  ? V
                  : never;

    export type ContextualFactory<C> = {
        <G extends Graph<any>, S extends Rec, ID extends string = string>(
            name: ID,
            members: Node.Members<G, S, C>,
        ): Proto.GraphNode<ID, G, S, C>;
    };
}

export namespace Node {
    export type ScopeResolve<S extends Rec, C> = Fn<[ResolverContext<C>], Promisify<S>> | S;

    export type ResolverContext<C> = IsNever<C> extends false ? {context: C} : {};

    export type Unpack<G extends Base<any>, K extends KeyOf<G, string>> = G[K] extends Node<infer V> ? V : G[K];
    export type UnpackArgs<G extends Base<any>, K extends KeyOf<G, string>> =
        G[K] extends Node<any, infer V> ? V : never;

    export type ExtractArgs<G extends Graph<any>, K extends KeyOf<G, string>> =
        G[K] extends Node<any, infer A> ? (A extends Args<any> ? Graph.Extract<A> : never) : never;

    export type Members<G extends Graph<any>, S extends Rec, C = never> = {
        [K in KeyOf<G, string>]: Member<G, K, S, C>;
    };

    export type MembersArgs<G extends Args<any>> = {
        [K in KeyOf<G, string>]: {type: MemberType<G, Unpack<G, K>, never>};
    };

    export type Member<G extends Graph<any>, K extends KeyOf<G, string>, S extends Rec, C> = ResolverRequire<
        {
            type: Fnify<MemberType<G, Unpack<G, K>, C>>;
            resolve?: (
                args: Proto.ResolveArgs<G, K, S, C>,
            ) => Promisify<ResolverReturnValue<MemberType<G, Unpack<G, K>, C>, S>>;
        },
        Equal<ToNullish<Unpack<G, K>>, ToNullish<S[K]>>
    > &
        MemberArgs<UnpackArgs<G, K>>;

    export type MemberArgs<A extends Args<any>> = IsNever<A> extends true ? {} : {args: Proto.ArgsNode<any, A>};

    export type ResolverRequire<C extends Rec, TOptional> = TOptional extends true ? C : Required<C>;

    export type ResolverReturnValue<P extends Proto.Any<any>, S> =
        P extends Proto.Type<any, "self", any>
            ? S
            : P extends Proto.Type<any, "graph", any>
              ? unknown // special case so we cannot infer a source type
              : P extends Proto.Type<string, Proto.Kind, infer V>
                ? V
                : never;

    export type MemberType<G extends Base<any>, T, C> =
        HasNull<T> extends true
            ? Proto.NullishType<MemberType<G, NonNullable<T>, C>>
            : T extends Array<infer A>
              ? Proto.ArrayType<MemberType<G, A, C>>
              : T extends Graph<any>
                ? Equal<T, G> extends true
                    ? Proto.SelfReference<T>
                    : Proto.GraphNode<any, T, any, C>
                : T extends Args<any>
                  ? Proto.ArgsNode<any, T>
                  : T extends Graph.Primitive
                    ? T extends boolean
                        ? Proto.Primitive<string, boolean> // deunionize boolean
                        : Proto.Primitive<string, T>
                    : Proto.Complex<string, T, any>;
}

export namespace Proto {
    export type Kind = "graph" | "args" | "complex" | "primitive" | "array" | "null" | "self";

    export interface Type<ID extends string, K extends Kind, T> {
        name: ID;
        kind: K;
        validate: (value: unknown) => value is T;
    }

    export type Any<T = any> = Type<any, Kind, T>;

    export type InferType<T> = T extends Any<infer E> ? E : never;

    export interface Primitive<ID extends string, T extends Graph.Primitive> extends Type<ID, "primitive", T> {}

    export interface SelfReference<G extends Graph<any>, S extends Rec = {}> extends Type<"self", "self", S> {
        $: G;
    }

    export interface Complex<ID extends string, T, O extends Graph.Primitive> extends Type<ID, "complex", T> {
        format: Any<O>;
        serialize: (value: T) => O;
        deserialize: (value: O) => T;
    }

    export type Composite<K extends Kind, T, C extends Proto.Any> = Type<any, K, T> & {
        child: C;
    };

    export interface NullishType<C extends Proto.Any> extends Composite<"null", Nullable<InferType<C>>, C> {}

    export interface ArrayType<C extends Proto.Any> extends Composite<"array", InferType<C>[], C> {}

    export interface Definition<
        ID extends string,
        K extends NodeKind,
        G extends Base<any, K>,
        S extends Rec,
        M extends Rec,
    > extends Proto.Type<ID, K, S> {
        $: G;
        members: M;
        keys(): KeyOf<M, string>[];
        has: (key: string) => key is KeyOf<M, string>;
    }

    export interface GraphNode<ID extends string, G extends Graph<any>, S extends Rec, C = never>
        extends Definition<ID, "graph", G, S, Node.Members<G, S, C>>,
            GraphFactory<ID, G, S, C> {}

    export type GraphFactory<ID extends string, G extends Graph<any>, S extends Rec, C = never> = {
        (): GraphNode<ID, G, S, C>;
        <PG extends Graph<any>, PK extends KeyOf<PG, string>, PS extends Rec>(
            resolve: (args: ResolveArgs<PG, PK, PS, C>) => S,
        ): GraphNodeDef<ID, G, S, PG, PK, PS, C>;
    };

    export type GraphNodeDef<
        ID extends string,
        G extends Graph<any>,
        S extends Rec,
        PG extends Graph<any>,
        PK extends KeyOf<PG, string>,
        PS extends Rec,
        C = never,
    > = {
        type: GraphNode<ID, G, S, C>;
        resolve: (args: ResolveArgs<PG, PK, PS, C>) => S;
    };

    export type ResolveArgs<G extends Graph<any>, K extends KeyOf<G, string>, S extends Rec, C> = {
        source: S;
        context: C;
        name: K;
        args: Node.ExtractArgs<G, K>;
        subquery: Subquery<G, S, C>;
    };

    export interface ArgsNode<ID extends string, A extends Args<any>>
        extends Definition<ID, "args", A, {}, Node.MembersArgs<A>> {}

    export type Referenced<T extends Any> = T & {type: T};
    export type Factory<T extends Any> = {
        readonly type: Referenced<T>;
        (): Referenced<T>;
        <G extends Graph<any>, K extends KeyOf<G, string>, S extends Rec, C>(
            resolve: (args: ResolveArgs<G, K, S, C>) => InferType<T>,
        ): {
            type: Referenced<T>;
            resolve: (args: ResolveArgs<G, K, S, C>) => InferType<T>;
        };
    };

    export type NodeDef<G extends Graph<any>, K extends KeyOf<G, string>, S extends Rec, T, R, C> = {
        type: T;
        resolve: (args: ResolveArgs<G, K, S, C>) => R;
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

    export type ArgsSelector<A extends Args<any>> = [args: Graph.Extract<A>];
    export type GraphSelector<G extends Graph<any>, A extends Args<any> = never> =
        IsNever<A> extends true ? [query: Query<G>] : [query: Query<G>, args: Graph.Extract<A>];

    export type Result<G extends Graph<any>, Q extends Query<G>> = Expand<{
        [K in KeyOf<Q, string>]: Q[K] extends Fnify<ReadDeny>
            ? null
            : K extends KeyOf<G, string>
              ? ResultNode<G, K, Q[K]>
              : never;
    }>;

    export type ResultNode<G extends Graph<any>, K extends KeyOf<G, string>, Q> =
        Q extends Fnify<ReadAllow>
            ? Graph.Extract<G>[K]
            : G[K] extends Graph.NodeAny<infer SG extends Arrayify<Graph<any>>>
              ? Q extends [infer SQ extends Query<DeArrayify<SG>>, ...any[]]
                  ? SG extends any[]
                      ? Result<DeArrayify<SG>, SQ>[]
                      : Result<DeArrayify<SG>, SQ>
                  : Q extends Rec<infer SK>
                    ? {[AK in SK]: ResultNode<G, K, Q[AK]>}
                    : 1
              : Graph.ExtractNode<G[K]>;
}
