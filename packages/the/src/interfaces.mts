export type Fn<A extends any[] = never[], R = unknown> = (...args: A) => R;
export type Fnify<T> = Fn<[], T> | T;
export type DeFnify<T> = T extends Fn<[], infer R> ? R : T;

export type Rec<K extends keyof any = any, T = any> = Record<K, T>;
export type Prop<T extends Rec, K extends keyof T> = T[K];
export type ReMap<T extends Rec, V> = {[K in keyof T]: V};
export type Entries<T> = {[K in keyof T]: [K, T[K]]}[keyof T];
export type FromEntries<T extends Entries<any>> = T extends Entries<infer S> ? S : never;
export type StrictRec<T extends Rec> = {[K in keyof T as T[K] extends undefined ? never : K]: T[K]};
export type Override<I extends Rec, O extends Rec> = Expand<Omit<I, keyof O> & O>;
export type Expand<T> = T extends infer O ? {[K in keyof O]: O[K]} : never;

export type Arrayify<T> = T | T[];
export type Recify<T, K extends string = string> = Rec<K, T> | T;
export type DeArrayify<T> = T extends Array<infer A> ? A : T;
export type Promisify<T> = T | Promise<T> | PromiseLike<T>;

export type KeyOf<T extends Rec, I extends string | number | symbol = string | number | symbol> = Extract<keyof T, I>;
export type KeyOfValue<T extends Rec, TExtends> = ValueOf<{[K in keyof Rec]: TExtends extends T[K] ? K : never}>;
export type ValueOf<T extends Rec> = T[keyof T];
export type StringKeyOf<T extends Rec> = KeyOf<T, string>;
export type PairKeyOf<
    TSpec extends Rec<string>,
    TQuery extends Rec<string>,
    I extends string | number | symbol = any,
> = Extract<KeyOf<TSpec, I>, KeyOf<TQuery, I>>;

export type Nullish<T> = T | null;
export type Nullable<T> = T | null | undefined;

export type ToAny<T, E> = Equal<T, any> extends true ? any : E;

export type Expect<T extends true> = T;
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
export type Extends<X, Y> = X extends Y ? true : false;
export type Label<T> = {[key: symbol]: T};

export type HasNull<T1> = null extends T1 ? true : false;
export type HasUndefined<T1> = [undefined] extends [T1] ? true : false;
export type HasNullOrUndefined<T1> = [null] extends [T1] ? true : HasUndefined<T1> extends true ? true : false;
export type IfTrue<TCond, TThen, TElse = never> = Equal<TCond, true> extends true ? TThen : TElse;
export type IsArray<T> = T extends any[] ? true : false;
export type IsNever<T> = [T] extends [never] ? true : false;
export type IsAny<T> = 0 extends 1 & T ? true : false;

export type LikeString = {toString(): string};

export type Exact<T, Shape> = T extends Shape ? (Exclude<keyof T, keyof Shape> extends never ? T : never) : never;
