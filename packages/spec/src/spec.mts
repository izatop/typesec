import type {Arrayify, DeArrayify, Nullable, Rec, StringKeyOf} from "@typesec/the";

export type ANT<T> = Nullable<Arrayify<Nullable<T>>>;
export type NANT<T> = NonNullable<DeArrayify<NonNullable<T>>>;

export type ID = symbol;
export type Primitive = string | boolean | number | bigint;
export type SimpleType = Primitive | ID | Date;
export type ComplexType = {[key: string]: ANT<TypeList>};
export type TypeList = SimpleType | ComplexType | Resolver.Any;
export type SourceType = Rec<string>;

export type Resolver<TType, TInput = never, TOverrides = never> = {
    $value: TType;
    $input: TInput;
    $mutate: TOverrides;
};

export type Input<TInput extends Spec.Any, TSource, TOverrides = never> = Resolver<TSource, TInput, TOverrides>;
export type Mutator<TSource, TReturns = TypeList> = Resolver<TSource, never, TReturns>;

export type Box<TSpec extends ComplexType, TSource extends SourceType, K extends StringKeyOf<TSpec>> = {
    key: K;
    spec: TSpec;
    source: TSource;
    type: TSpec[K];
    value: TSource[K];
};

export type Spec<TSpec extends ComplexType, TSource extends SourceType = never> = {
    [K in StringKeyOf<TSpec>]: Box<TSpec, TSource, K>;
};

export type SpecOf<TSource extends SourceType, TSpec extends Spec.SuggestKindOf<TSource>> = Spec<TSpec, TSource>;

export namespace Spec {
    export type Any = Spec<any, any>;
    export type Get<TSpec extends Any, K extends StringKeyOf<TSpec>> = TSpec[K];
    export type GetSpec<TSpec extends Any, K extends StringKeyOf<TSpec>> = TSpec[K]["spec"];
    export type GetType<TSpec extends Any, K extends StringKeyOf<TSpec>> = TSpec[K]["type"];
    export type GetSource<TSpec extends Any, K extends StringKeyOf<TSpec>> = TSpec[K]["source"];
    export type GetValue<TSpec extends Any, K extends StringKeyOf<TSpec>> = TSpec[K]["value"];

    export type GetCleanType<TSpec extends Any, K extends StringKeyOf<TSpec>> = NANT<TSpec[K]["type"]>;

    export type GetCleanValue<TSpec extends Any, K extends StringKeyOf<TSpec>> = NANT<TSpec[K]["value"]>;

    export type SuggestKindOf<TSource extends SourceType> = {
        [K in StringKeyOf<TSource>]?: Resolver<TSource[K], any, any> | SuggestValueOf<TSource[K]>;
    };

    export type SuggestValueOf<TValue> =
        TValue extends Nullable<SimpleType>
            ? TValue | ID
            : TValue extends Nullable<SimpleType[]>
              ? TValue | ID[]
              : TValue extends Nullable<(infer A extends Rec)[]>
                ? Spec<Rec, A>[]
                : TValue extends any[]
                  ? "<TValue[] extends any[]> is an unsupported type"
                  : TValue extends SourceType
                    ? Spec<any, any>
                    : "<TValue> has an unsupported type";
}

export namespace Resolver {
    export type Any = Resolver<any, any, any>;
}
