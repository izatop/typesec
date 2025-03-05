import type {DeArrayify, Expand, Fn, PairKeyOf, StringKeyOf} from "@typesec/the";
import type {NANT, SimpleType, Spec} from "./spec.mjs";

export type Query<TSpec extends Spec.Any> = {
    [K in StringKeyOf<TSpec>]?: Query.Field<Spec.GetType<TSpec, K>>;
};

export namespace Query {
    export type Read = 1 | true;
    export type Asterisk = "*";
    export type Any = Query<any>;

    export type Mutator<TType, TReturn> = Fn<[TType], TReturn>;
    export type Field<TType> = FieldClean<TType, NANT<TType>>;
    export type FieldClean<TType, TClean> = TType extends any[]
        ? TClean extends Spec.Any
            ? [Asterisk | Query<TClean>]
            : Mutator<TType, any> | [Read] | [Mutator<TClean, any>]
        : TClean extends SimpleType
          ? Read | Mutator<TType, any>
          : TClean extends Spec.Any
            ? Asterisk | Query<TClean> | Mutator<TType, any>
            : "<Unsupported type>";

    export type Resolve<TSpec extends Spec.Any, TQuery extends Query<TSpec>> = {
        [K in PairKeyOf<TSpec, TQuery, string>]: ResolveNode<TSpec, TQuery, K>;
    };

    export type ResolveNode<
        TSpec extends Spec.Any,
        TQuery extends Query<TSpec>,
        K extends PairKeyOf<TSpec, TQuery, string>,
    > = TQuery[K] extends (infer TResolver)[]
        ? TResolver extends Read
            ? Spec.GetType<TSpec, K>
            : TResolver extends Mutator<any, infer R>
              ? (R | Exclude<DeArrayify<Spec.GetType<TSpec, K>>, Spec.GetCleanType<TSpec, K>>)[]
              : TResolver extends Query<Spec.GetCleanType<TSpec, K>>
                ?
                      | Expand<Resolve<Spec.GetCleanType<TSpec, K>, TResolver>>[]
                      | Exclude<DeArrayify<Spec.GetType<TSpec, K>>, Spec.GetCleanType<TSpec, K>>
                : "<Unsupported resolver>"
        : TQuery[K] extends Read
          ? Spec.GetCleanType<TSpec, K> extends SimpleType
              ? Spec.GetType<TSpec, K> // return value
              : never
          : TQuery[K] extends Mutator<Spec.GetType<TSpec, K>, infer R>
            ? R
            : TQuery[K] extends Asterisk
              ?
                    | Expand<ResolveAsterisk<Spec.GetType<TSpec, K>>>
                    | Exclude<DeArrayify<Spec.GetType<TSpec, K>>, Spec.GetCleanType<TSpec, K>>
              : TQuery[K] extends Query<Spec.GetSpec<TSpec, K>>
                ? "<Prototype>"
                : never;

    export type ResolveAsterisk<TSpec> = TSpec extends Spec.Any
        ? {[K in StringKeyOf<TSpec>]: Spec.GetCleanType<TSpec, K> extends Spec.Any ? never : Spec.GetType<TSpec, K>}
        : never;
}
