import type {Spec} from "@typesec/spec";
import {type Fn, type LikeString, type Rec, type StringKeyOf} from "@typesec/the";

export type SourceId<TSourceID> = TSourceID extends never ? LikeString : TSourceID;

export type Schema<TContext, TSpec extends Spec.Any> = {
    [K in Schema.KeyOfInput<TSpec>]: Schema.Resolver<TContext, TSpec, Spec.KindOf<TSpec>, K>;
} & {[K in Schema.KeyOfSource<TSpec>]?: Schema.Getter<TContext, TSpec, Spec.KindOf<TSpec>, K>} & {
    [K in Schema.KeyOfVirtual<TSpec>]: Schema.Virtual<TContext, TSpec, Spec.KindOf<TSpec>, K>;
};

export namespace Schema {
    export type ValueOf<T extends Rec> = T[StringKeyOf<T>];

    export type KeyOfInput<TSpec extends Spec.Any> = ValueOf<{
        [K in StringKeyOf<TSpec>]: Spec.PickInput<TSpec, K> extends never ? never : K;
    }>;

    export type KeyOfSource<TSpec extends Spec.Any> = ValueOf<{
        [K in Exclude<StringKeyOf<TSpec>, KeyOfInput<TSpec>>]: Spec.KindOf<TSpec> extends never
            ? never
            : K extends StringKeyOf<Spec.KindOf<TSpec>>
              ? K
              : never;
    }>;

    export type KeyOfVirtual<TSpec extends Spec.Any> = ValueOf<{
        [K in Exclude<StringKeyOf<TSpec>, KeyOfInput<TSpec>>]: Spec.KindOf<TSpec> extends never
            ? K
            : K extends StringKeyOf<Spec.KindOf<TSpec>>
              ? never
              : K;
    }>;

    export type Resolver<TContext, TSpec extends Spec.Any, TSource extends Rec, K extends StringKeyOf<TSpec>> = Fn<
        [Payload<TContext, TSource, Spec.PickInput<TSpec, K>>],
        Returns<Spec.ToReturnValue<TSpec, K>>
    >;

    export type Getter<TContext, TSpec extends Spec.Any, TSource extends Rec, K extends StringKeyOf<TSpec>> =
        | Spec.ToReturnValue<TSpec, K>
        | Resolver<TContext, TSpec, TSource, K>;

    export type Virtual<TContext, TSpec extends Spec.Any, TSource extends Rec, K extends StringKeyOf<TSpec>> =
        | Spec.ToReturnValue<TSpec, K>
        | Resolver<TContext, TSpec, TSource, K>;

    export type Returns<T> = T;

    export type Any = Schema<any, any>;
    export type AnyNull = Any | null;

    export type Payload<TContext, TSource, TInput> = {
        context: TContext;
        source: TSource;
        input: Spec.TryInput<TInput>;
    };
}
