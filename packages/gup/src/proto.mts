import {array} from "@typesec/the/array";
import {assert} from "@typesec/the/assert";
import {fn, isNullable} from "@typesec/the/fn";
import type {Arrayify, Fn, Guard, GuardUnion, KeyOf, Nullable, Promisify, Rec} from "@typesec/the/type";
import type {Constraints} from "./constraints.mts";
import type {Primitives} from "./interfaces.mts";

export namespace Proto {
    export type PrimitiveKind = "string" | "boolean" | "number";
    export type ListKind = "array";
    export type TupleKind = "tuple";
    export type UnionKind = "union";
    export type MaybeKind = "maybe";
    export type CodecKind = "codec";
    export type ComplexKind = "complex";
    export type CompositeKind = ListKind | MaybeKind | TupleKind | UnionKind;
    export type Kind = PrimitiveKind | CompositeKind | CodecKind | ComplexKind;

    export type ListId = `Array<${string}>`;
    export type MaybeId = `Maybe<${string}>`;

    export type Infer<P> = P extends {isValid: GuardUnion<infer T, any>} ? T : unknown;

    export type KindOf<P, R extends Kind> = P extends Base<any, infer T extends R, any, any> ? T : never;

    export type WithConstraints<P> = P & Constraints<Infer<P>>;

    export type PrimitiveShape<K extends PrimitiveKind> = {
        string: string;
        boolean: boolean;
        number: number;
    }[K];

    export type Base<ID extends string, K extends Kind, T, U> = {
        id: ID;
        kind: K;
        isKind: Guard<U>;
        isValid: GuardUnion<T, U>;
    };

    export type Any<T = any, K extends Kind = any> = Base<string, K, T, any>;

    export type DistributeToAny<T> = T extends unknown ? Any<T> : never;

    export type CompositeList<T> = {
        subject: DistributeToAny<T>[];
    };

    export type CompositeMaybe<T> = {
        subject: Proto.Any<T>;
    };

    export type CompositeUnion<T> = {
        subject: DistributeToAny<T>[];
    };

    export type CompositeTuple<T extends readonly unknown[]> = {
        subject: {[K in keyof T]: Any<T[K]>};
    };

    export type TToTuple<T> = T extends readonly unknown[] ? T : readonly unknown[];

    export type CompositeShape<K extends CompositeKind, T> = K extends ListKind
        ? CompositeList<T>
        : K extends MaybeKind
          ? CompositeMaybe<T>
          : K extends UnionKind
            ? CompositeUnion<T>
            : K extends TupleKind
              ? CompositeTuple<TToTuple<T>>
              : {reason: never};

    export type Composite<ID extends string, K extends CompositeKind, T, U, S> = Base<ID, K, T, U> &
        CompositeShape<K, S>;

    export type PrimitiveInitial<ID extends string, K extends PrimitiveKind> = Omit<
        Base<ID, K, PrimitiveShape<K>, PrimitiveShape<K>>,
        "isKind"
    >;

    export type Primitive<ID extends string, K extends PrimitiveKind, T> = Base<ID, K, T, T>;

    export type CodecRaw = [id: string, value: string];

    export type CodecInitializer<ID extends string, T, U = T> = Base<ID, CodecKind, T, U> & {
        encode: Fn<[value: T], Promisify<string>>;
        decode: Fn<[encoded: string], Promisify<T | unknown>>;
    };

    export type Codec<ID extends string, T, U = T> = Base<ID, CodecKind, T, U> & {
        encode: Fn<[value: T], Promise<CodecRaw>>;
        decode: Fn<[encoded: unknown], Promise<T | unknown>>;
    };

    export type List<T, ID extends string = ListId> = Composite<ID, "array", T[], unknown[], T>;

    export type Tuple<ID extends string, T> = Composite<ID, "tuple", T, readonly unknown[], T>;

    export type Union<ID extends string, T> = Composite<ID, "union", T, T | unknown, T>;

    export type Maybe<T = unknown> = Composite<MaybeId, "maybe", Nullable<T>, Nullable<T>, T>;

    export type Complex<ID extends string, T> = [T] extends [Rec]
        ? Base<ID, "complex", T, Rec<string, unknown>> & ComplexMembers<T>
        : Base<ID, "complex", unknown, unknown>;

    export type ComplexMembers<T extends Rec> = {[K in KeyOf<T, string>]: Any<T[K]>};

    export type Usable<T> =
        | Primitive<string, PrimitiveKind, T>
        | Codec<string, T>
        | List<T>
        | Union<string, T>
        | Tuple<string, T>
        | Maybe<T>
        | Complex<string, T>;

    export type Refine<P extends Any> = P & {
        (constraints: Constraints<Infer<P>>): WithConstraints<P>;
        (): P;
    };
}

function is<T extends Primitives, K extends Proto.PrimitiveKind>(
    type: Proto.Any | Proto.Any<T, K>,
    kind: K,
): type is Proto.Primitive<string, K, T>;
function is<T>(type: Proto.Any<Nullable<T>>, kind: Proto.MaybeKind): type is Proto.Maybe<T>;
function is<T>(type: Proto.Any<T>, kind: Proto.UnionKind): type is Proto.Union<string, T>;
function is<T>(type: Proto.Any<T>, kind: Proto.TupleKind): type is Proto.Tuple<string, T>;
function is<T>(type: Proto.Any<T>, kind: Proto.CodecKind): type is Proto.Codec<string, T>;
function is<T>(type: Proto.Any<T[]>, kind: Proto.ListKind): type is Proto.List<T>;
function is(type: Proto.Any<any>, kind: string): type is Proto.Any<any> {
    return type.kind === kind;
}

export function list<T>(subject: Arrayify<Proto.DistributeToAny<T>>): Proto.List<T>;
export function list<T>(
    subject: Arrayify<Proto.DistributeToAny<T>>,
    constraints: Constraints<T[]>,
): Proto.WithConstraints<Proto.List<T>>;
export function list<T>(
    subject: Arrayify<Proto.DistributeToAny<T>>,
    constraints?: Constraints<T[]>,
): Proto.WithConstraints<Proto.List<T>> | Proto.List<T> {
    subject = array.arraify(subject);

    return {
        ...constraints,
        subject,
        id: `Array<${subject.map(({id}) => id).join("|")}>`,
        kind: "array",
        isKind: (value) => Array.isArray(value),
        isValid: (value): value is T[] => value.every((item) => subject.some((s) => s.isKind(item) && s.isValid(item))),
    };
}

export function maybe<T>(subject: Proto.Any<T>): Proto.Maybe<T>;
export function maybe<T>(subject: Proto.Any<T>, constraints: Constraints<T>): Proto.WithConstraints<Proto.Maybe<T>>;
export function maybe<T>(
    subject: Proto.Any<T>,
    constraints?: Constraints<T>,
): Proto.WithConstraints<Proto.Maybe<T>> | Proto.Maybe<T> {
    return {
        ...constraints,
        subject,
        id: `Maybe<${subject.id}>`,
        kind: "maybe",
        isKind: (value) => null === isNullable(value) || subject.isKind(value),
        isValid: (value): value is T => isNullable(value) || subject.isValid(value),
    };
}

export function codec<ID extends string, T>(
    initial: Omit<Proto.CodecInitializer<ID, T>, "kind">,
    constraints?: Constraints<T>,
): Proto.Refine<Proto.Codec<ID, T>> {
    const {encode: enc, decode: dec, ...args} = initial;
    const type: Proto.Codec<ID, T> = {
        ...args,
        ...constraints,
        kind: "codec",
        decode: async (input) => {
            assert(Array.isArray(input), "ERR_CODEC_WRONG_FORMAT");

            const [id, value] = input;
            assert(id === initial.id, "ERR_CODEC_WRONG_ID");
            assert(fn.is(value, "string"), "ERR_CODEC_WRONG_VALUE");

            try {
                return await dec(value);
            } catch (cause) {
                throw new Error("ERR_CODEC_DECODE_ERROR", {cause});
            }
        },
        encode: async (value) => {
            try {
                return [initial.id, await enc(value)];
            } catch (cause) {
                throw new Error("ERR_CODEC_ENCODE_ERROR", {cause});
            }
        },
    };

    function factory(constraints?: Constraints<T>) {
        return {...type, ...constraints};
    }

    return Object.assign(factory, type) as Proto.Refine<Proto.Codec<ID, T>>;
}

export function tuple<ID extends string, T extends readonly any[]>(
    initial: Omit<Proto.Tuple<ID, T>, "kind">,
    constraints?: Constraints<T>,
): Proto.Refine<Proto.Tuple<ID, T>> {
    const type = {...initial, kind: "codec", ...constraints};
    function factory(constraints?: Constraints<T>) {
        return {...type, ...constraints};
    }

    return Object.assign(factory, type) as Proto.Refine<Proto.Tuple<ID, T>>;
}

export function complex<ID extends string, T extends Rec<string, any>>(
    initial: Omit<Proto.Complex<ID, T>, "kind">,
    constraints?: Constraints<T>,
): Proto.Refine<Proto.Complex<ID, T>> {
    const type = {...constraints, ...initial, kind: "codec"};
    function factory(constraints?: Constraints<T>) {
        return {...type, ...constraints};
    }

    return Object.assign(factory, type) as Proto.Refine<Proto.Complex<ID, T>>;
}

export function primitive<ID extends string, K extends Proto.PrimitiveKind>(
    initial: Proto.PrimitiveInitial<ID, K>,
    constraints?: Constraints<Proto.PrimitiveShape<K>>,
): Proto.Refine<Proto.Primitive<ID, K, Proto.PrimitiveShape<K>>> {
    const type: Proto.Primitive<ID, K, Proto.PrimitiveShape<K>> = {
        ...constraints,
        ...initial,
        isKind: initial.isValid as Guard<Proto.PrimitiveShape<K>>,
    };

    function factory(constraints?: Constraints<Proto.PrimitiveShape<K>>) {
        return {...type, ...constraints};
    }

    return Object.assign(factory, type) as Proto.Refine<Proto.Primitive<ID, K, Proto.PrimitiveShape<K>>>;
}

export const proto = {
    is,
    list,
    codec,
    tuple,
    maybe,
    primitive,
};
