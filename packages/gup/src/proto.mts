import {array} from "@typesec/the/array";
import {assert} from "@typesec/the/assert";
import {fn, isNullable} from "@typesec/the/fn";
import object from "@typesec/the/object";
import type {Arrayify, Fn, Guard, GuardUnion, KeyOf, Nullable, Promisify, Rec} from "@typesec/the/type";
import type {Constraints} from "./constraints.mts";
import type {Primitives} from "./interfaces.mts";

export namespace Proto {
    export type ScalarKind = "string" | "boolean" | "number";
    export type ListKind = "array";
    export type TupleKind = "tuple";
    export type UnionKind = "union";
    export type MaybeKind = "maybe";
    export type CodecKind = "codec";
    export type ComplexKind = "complex";
    export type CompositeKind = ListKind | MaybeKind | TupleKind | UnionKind;
    export type Kind = ScalarKind | CompositeKind | CodecKind | ComplexKind;

    export type ListId = `Array<${string}>`;
    export type TupleId = `Tuple<${string}>`;
    export type MaybeId = `Maybe<${string}>`;

    export type Infer<P> = P extends {isValid: GuardUnion<infer T, any>} ? T : unknown;

    export type KindOf<P, R extends Kind> = P extends Base<any, infer T extends R, any, any> ? T : never;

    export type WithConstraints<P> = P & Constraints<Infer<P>>;

    export type ScalarShape<K extends ScalarKind> = {
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

    export type DistributeTuple<T> = {[K in keyof T]: Any<T[K]>};
    export type CompositeTuple<T> = {
        subject: DistributeTuple<T>;
    };

    export type CompositeShape<K extends CompositeKind, T> = K extends ListKind
        ? CompositeList<T>
        : K extends MaybeKind
          ? CompositeMaybe<T>
          : K extends UnionKind
            ? CompositeUnion<T>
            : K extends TupleKind
              ? CompositeTuple<T>
              : {reason: never};

    export type Composite<ID extends string, K extends CompositeKind, T, U, S> = Base<ID, K, T, U> &
        CompositeShape<K, S>;

    export type ScalarInitial<ID extends string, K extends ScalarKind> = Omit<
        Base<ID, K, ScalarShape<K>, ScalarShape<K>>,
        "isKind"
    >;

    export type Scalar<ID extends string, K extends ScalarKind, T> = Base<ID, K, T, T>;

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

    export type Tuple<T, ID extends string = TupleId> = Composite<ID, "tuple", T, readonly unknown[], T>;

    export type UnionId = `Union<${string}>`;
    export type Union<T, ID extends string = UnionId> = Composite<ID, "union", T, T | unknown, T>;

    export type Maybe<T = unknown> = Composite<MaybeId, "maybe", Nullable<T>, Nullable<T>, T>;

    export type Complex<ID extends string, T> = Base<ID, "complex", T, Rec<string, unknown>> &
        ComplexMembers<[T] extends [Rec<string, unknown>] ? T : {ERROR_TYPE_MUST_BE_RECORD: never}>;

    export type ComplexMembers<T extends Rec> = {
        members: {[K in KeyOf<T, string>]: Any<T[K]>};
    };

    export type Usable<T> =
        | Scalar<string, ScalarKind, T>
        | Codec<string, T>
        | List<T>
        | Union<T>
        | Tuple<T>
        | Maybe<T>
        | Complex<string, T>;

    export type Refine<P extends Any> = P & {
        (constraints: Constraints<Infer<P>>): WithConstraints<P>;
        (): P;
    };
}

function refine<P extends Proto.Any>(type: P): Proto.Refine<P> {
    function factory(constraints?: Constraints<Proto.Infer<P>>) {
        return object.is(constraints) ? {...type, ...constraints} : type;
    }

    return Object.assign(factory, type) as Proto.Refine<P>;
}

function is<T extends Primitives, K extends Proto.ScalarKind>(
    type: Proto.Any | Proto.Any<T, K>,
    kind: K,
): type is Proto.Scalar<string, K, T>;
function is<T>(type: Proto.Any<Nullable<T>>, kind: Proto.MaybeKind): type is Proto.Maybe<T>;
function is<T>(type: Proto.Any<T>, kind: Proto.UnionKind): type is Proto.Union<T>;
function is<T>(type: Proto.Any<T>, kind: Proto.TupleKind): type is Proto.Tuple<T>;
function is<T>(type: Proto.Any<T>, kind: Proto.CodecKind): type is Proto.Codec<string, T>;
function is<T>(type: Proto.Any<T[]>, kind: Proto.ListKind): type is Proto.List<T>;
function is(type: Proto.Any<any>, kind: string): type is Proto.Any<any> {
    return type.kind === kind;
}

export function list<P extends Proto.DistributeToAny<any>, T extends Proto.Infer<P>>(
    subject: Arrayify<P>,
): Proto.Refine<Proto.List<T>>;
export function list<P extends Proto.DistributeToAny<any>, T extends Proto.Infer<P>>(
    subject: Arrayify<P>,
    constraints: Constraints<T[]>,
): Proto.WithConstraints<Proto.Refine<Proto.List<T>>>;
export function list<P extends Proto.DistributeToAny<any>, T extends Proto.Infer<P>>(
    subject: Arrayify<P>,
    constraints?: Constraints<T[]>,
): Proto.WithConstraints<Proto.Refine<Proto.List<T>>> | Proto.Refine<Proto.List<T>> {
    subject = array.arraify(subject);

    return refine({
        ...constraints,
        subject: subject as unknown as Proto.DistributeToAny<T>[],
        id: `Array<${subject.map(({id}) => id).join("|")}>`,
        kind: "array",
        isKind: (value) => Array.isArray(value),
        isValid: (value): value is T[] => value.every((item) => subject.some((s) => s.isKind(item) && s.isValid(item))),
    });
}

export function union<P extends Proto.DistributeToAny<any>, T extends Proto.Infer<P>>(
    subject: Array<P>,
): Proto.Refine<Proto.Union<T>>;
export function union<P extends Proto.DistributeToAny<any>, T extends Proto.Infer<P>>(
    subject: Array<P>,
    constraints: Constraints<T>,
): Proto.WithConstraints<Proto.Refine<Proto.Union<T>>>;
export function union<P extends Proto.DistributeToAny<any>, T extends Proto.Infer<P>>(
    subject: Array<P>,
    constraints?: Constraints<T>,
): Proto.WithConstraints<Proto.Refine<Proto.Union<T>>> | Proto.Refine<Proto.Union<T>> {
    return refine({
        ...constraints,
        subject: subject as unknown as Proto.DistributeToAny<T>[],
        id: `Union<${subject.map(({id}) => id).join("|")}>`,
        kind: "union",
        isKind: (_): _ is unknown => true,
        isValid: (value): value is T => subject.some((s) => s.isKind(value) && s.isValid(value)),
    });
}

export function tuple<T extends readonly unknown[]>(subject: Proto.DistributeTuple<T>): Proto.Refine<Proto.Tuple<T>>;
export function tuple<T extends readonly unknown[]>(
    subject: Proto.DistributeTuple<T>,
    constraints: Constraints<T>,
): Proto.WithConstraints<Proto.Refine<Proto.Tuple<T>>>;
export function tuple<T extends readonly unknown[]>(
    subject: Proto.DistributeTuple<T>,
    constraints?: Constraints<T>,
): Proto.WithConstraints<Proto.Refine<Proto.Tuple<T>>> | Proto.Refine<Proto.Tuple<T>> {
    const type: Proto.Tuple<T> = {
        ...constraints,
        subject: subject as Proto.DistributeTuple<T>,
        kind: "tuple",
        id: `Tuple<${subject.map((s) => s.id).join("|")}>`,
        isKind: (value) => Array.isArray(value),
        isValid: (value): value is T => {
            if (value.length !== subject.length) {
                return false;
            }

            const combined = subject.map((s, index) => [s, value[index]] as const);

            return combined.every(([s, v]) => s.isKind(v) && s.isValid(v));
        },
    };

    return refine(type);
}

export function maybe<T>(subject: Proto.Any<T>): Proto.Refine<Proto.Maybe<T>>;
export function maybe<T>(
    subject: Proto.Any<T>,
    constraints: Constraints<T>,
): Proto.WithConstraints<Proto.Refine<Proto.Maybe<T>>>;
export function maybe<T>(
    subject: Proto.Any<T>,
    constraints?: Constraints<T>,
): Proto.WithConstraints<Proto.Refine<Proto.Maybe<T>>> | Proto.Refine<Proto.Maybe<T>> {
    const type: Proto.Maybe<T> = {
        ...constraints,
        subject,
        id: `Maybe<${subject.id}>`,
        kind: "maybe",
        isKind: (value) => null === isNullable(value) || subject.isKind(value),
        isValid: (value): value is T => isNullable(value) || subject.isValid(value),
    };

    return refine(type);
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

    return refine(type);
}

export function complex<T extends Rec<string, any>>(
    initial: Omit<Proto.Complex<string, T>, "kind" | "isKind" | "isValid">,
    constraints?: Constraints<T>,
): Proto.Refine<Proto.Complex<string, T>> {
    const {members} = initial;
    const type: Proto.Complex<string, T> = {
        ...constraints,
        ...initial,
        kind: "complex",
        isKind: object.is,
        isValid: (input): input is T => {
            const keys = array.uniq([...object.keys(members), ...object.keys(input)]);

            for (const key of keys) {
                if (!object.hasKeyOf(members, key)) {
                    return false;
                }

                const value = input[key];
                const member = members[key];
                if (!member.isKind(value) || !member.isValid(value)) {
                    return false;
                }
            }

            return true;
        },
    };

    return refine(type);
}

export function scalar<ID extends string, K extends Proto.ScalarKind>(
    initial: Proto.ScalarInitial<ID, K>,
    constraints?: Constraints<Proto.ScalarShape<K>>,
): Proto.Refine<Proto.Scalar<ID, K, Proto.ScalarShape<K>>> {
    const type: Proto.Scalar<ID, K, Proto.ScalarShape<K>> = {
        ...constraints,
        ...initial,
        isKind: initial.isValid as Guard<Proto.ScalarShape<K>>,
    };

    return refine(type);
}

export const proto = {
    is,
    list,
    codec,
    union,
    tuple,
    maybe,
    complex,
    scalar,
    primitive: scalar,
};
