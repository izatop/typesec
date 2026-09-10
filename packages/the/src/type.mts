/**
 * Any function, narrowed by its argument tuple and return type.
 * @category type
 */
export type Fn<A extends any[] = never[], R = unknown> = (...args: A) => R;
/**
 * A value or a thunk that produces it.
 * @category type
 */
export type Fnify<T> = Fn<[], T> | T;
/**
 * The value behind a `Fnify`.
 * @category type
 */
export type DeFnify<T> = T extends Fn<[], infer R> ? R : T;

/**
 * A record with narrowed key and value types.
 * @category type
 */
export type Rec<K extends keyof any = any, T = any> = Record<K, T>;
/**
 * The type of one property.
 * @category type
 */
export type Prop<T extends Rec, K extends keyof T> = T[K];
/**
 * Keeps the keys of a record and replaces every value type with `V`.
 * @category type
 */
export type ReMap<T extends Rec, V> = {[K in keyof T]: V};
/**
 * The union of `[key, value]` pairs of a record.
 * @category type
 */
export type Entries<T, K extends keyof T = keyof T> = {[K in keyof T]: [K, T[K]]}[K];
/**
 * Rebuilds a record from its `Entries` pairs.
 * @category type
 */
export type FromEntries<T extends Entries<any>[]> = T extends Entries<infer R>[] ? R : never;
/**
 * Drops every property that may be `undefined`.
 * @category type
 */
export type StrictRec<T extends Rec> = Drop<T, undefined>;
/**
 * Drops every property whose type admits `V`.
 * @category type
 */
export type Drop<T extends Rec, V> = {[K in keyof T as V extends T[K] ? never : K]: T[K]};
/**
 * Overlays `O` onto `I`, with `O` winning on shared keys.
 * @category type
 */
export type Override<I extends Rec, O extends Rec> = Expand<Omit<I, keyof O> & O>;
/**
 * Flattens an intersection into a single object type, so editors show it in full.
 * @category type
 */
export type Expand<T> = T extends infer O ? {[K in keyof O]: O[K]} : never;
/**
 * A value or a record of such values.
 * @category type
 */
export type Recify<T, K extends string = string> = Rec<K, T> | T;
/**
 * Any key a record can be indexed by.
 * @category type
 */
export type RecKey = string | number | symbol;

/**
 * The keys of a record whose value type does not admit `undefined`.
 * @category type
 */
export type RequiresKeysOf<T extends Rec, I extends RecKey = RecKey> = {
    [K in KeyOf<T, I>]: HasUndefined<T[K]> extends true ? never : K;
}[KeyOf<T, I>];

/**
 * A value or an array of them.
 * @category type
 */
export type Arrayify<T> = T | T[];
/**
 * The element type of an array, or the value itself.
 * @category type
 */
export type DeArrayify<T> = T extends Array<infer A> ? A : T;
/**
 * The element type of an array.
 * @category type
 */
export type InferArray<T extends any[]> = T extends (infer A)[] ? A : never;

/**
 * A value, a promise of it, or a thenable of it.
 * @category type
 */
export type Promisify<T> = T | Promise<T> | PromiseLike<T>;
/**
 * A `Promisify` that also admits a foreign thenable.
 * @category type
 */
export type MaybeThenable<T> = Promisify<T> | {then: (resolve: (value: number) => void) => any};

/**
 * The keys of a record, optionally narrowed to one key kind.
 * @category type
 */
export type KeyOf<T extends Rec, I extends string | number | symbol = string | number | symbol> = Extract<keyof T, I>;
/**
 * The keys whose value type admits `TExtends`.
 * @category type
 */
export type KeyOfValue<T extends Rec, TExtends> = ValueOf<{
    [K in keyof T]: TExtends extends T[K] ? K : never;
}>;
/**
 * The union of a record's value types.
 * @category type
 */
export type ValueOf<T extends Rec> = T[keyof T];
/**
 * The string keys of a record.
 * @category type
 */
export type StringKeyOf<T extends Rec> = KeyOf<T, string>;
/**
 * The keys two records share.
 * @category type
 */
export type PairKeyOf<
    TSpec extends Rec<string>,
    TQuery extends Rec<string>,
    I extends string | number | symbol = any,
> = Extract<KeyOf<TSpec, I>, KeyOf<TQuery, I>>;

/**
 * Whether `K` is a key of the record.
 * @category type
 */
export type HasKeyOf<T extends Rec, K> = [K] extends [KeyOf<T>] ? true : false;

/**
 * Makes the listed keys optional and leaves the rest as they are.
 * @category type
 */
export type PartialKeys<T extends Rec, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * A value or `null`.
 * @category type
 */
export type Nullable<T> = T | null;
/**
 * A value, `null` or `undefined`.
 * @category type
 */
export type Nullish<T> = T | null | undefined;
/**
 * A value or `undefined`.
 * @category type
 */
export type Optional<T> = T | undefined;

/**
 * Collapses to `any` when `T` is `any`, and to `E` otherwise.
 * @category type
 */
export type ToAny<T, E> = Equal<T, any> extends true ? any : E;
/**
 * Normalises a nullish type to `T | null`.
 * @category type
 */
export type ToNullable<T> = IsNullable<T> extends true ? Nullable<NonNullable<T>> : T;

/**
 * Compile-time assertion: fails to typecheck unless `T` is `true`.
 * @category testing
 */
export type Expect<T extends true> = T;
/**
 * Whether two types are identical, not merely assignable.
 * @category type
 */
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
/**
 * Whether `X` is assignable to `Y`.
 * @category type
 */
export type Extends<X, Y> = X extends Y ? true : false;
/**
 * A symbol-keyed brand, to tag a type without changing its shape.
 * @category type
 */
export type Label<T> = {[key: symbol]: T};

/**
 * Whether the type admits `null`.
 * @category type
 */
export type HasNull<T1> = [null] extends [T1] ? true : false;
/**
 * Whether the type admits `undefined`.
 * @category type
 */
export type HasUndefined<T1> = [undefined] extends [T1] ? true : false;
/**
 * Whether the type admits `null` or `undefined`.
 * @category type
 */
export type IsNullable<T1> = HasNull<T1> extends true ? true : HasUndefined<T1> extends true ? true : false;
/**
 * Branches on a boolean type.
 * @category type
 */
export type IfTrue<TCond, TThen, TElse = never> = Equal<TCond, true> extends true ? TThen : TElse;
/**
 * Whether the type is an array.
 * @category type
 */
export type IsArray<T> = T extends any[] ? true : false;
/**
 * Whether the type is `never`.
 * @category type
 */
export type IsNever<T> = [T] extends [never] ? true : false;
/**
 * Whether the type is `any`.
 * @category type
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;
/**
 * Whether the type is exactly `unknown`.
 * @category type
 */
export type IsUnknown<T> = Equal<T, unknown>;
/**
 * Whether the type admits `unknown` anywhere in it.
 * @category type
 */
export type HasUnknown<T> =
    unknown extends Extract<T, unknown> ? (unknown extends T ? true : T extends unknown ? false : true) : false;

/**
 * Anything that can render itself as a string.
 * @category type
 */
export type LikeString = {toString(): string};

/**
 * Admits `T` only when it carries no keys beyond `Shape`.
 * @category type
 */
export type Exact<T, Shape> = T extends Shape ? (Exclude<keyof T, keyof Shape> extends never ? T : never) : never;

/**
 * A type guard over an unknown value.
 * @category guard
 */
export type Guard<T> = (value: unknown) => value is T;
/**
 * A type guard that narrows one member out of a union.
 * @category guard
 */
export type GuardUnion<T, U = T> = (value: T | U) => value is T;

/**
 * A class constructor producing `T`, with optional static members `P`.
 * @category type
 */
export type Constructor<T, A extends any[] = any[], P extends Rec = Rec> = {
    new (...args: A): T;
} & P;

/**
 * An abstract class constructor producing `T`, with optional static members `P`.
 * @category type
 */
export type ConstructorAbstract<T, A extends any[] = any[], P extends Rec = Rec> = (abstract new (...args: A) => T) & P;
