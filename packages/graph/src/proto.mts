import {has, isNullable} from "@typesec/the";
import object from "@typesec/the/object";
import type {KeyOf, Nullable, Rec} from "@typesec/the/type";
import type {Args, Graph, Proto} from "./interfaces.mts";

export const ProtoSymbol = Symbol();

function referenced<T extends Proto.Any>(type: T): Proto.Referenced<T> {
    return Object.assign(type, {
        get type() {
            return type;
        },
    });
}

export function proto<ID extends string, T, O extends Graph.Primitive>(
    args: Proto.Complex<ID, T, O>,
): Proto.Factory<Proto.Complex<ID, T, O>>;
export function proto<ID extends string, T extends Graph.Primitive, K extends Proto.Kind>(
    args: Proto.Type<ID, K, T>,
): Proto.Factory<Proto.Type<ID, K, T>>;
export function proto(type: Proto.Any): Proto.Factory<any> {
    type = referenced(type);

    const factory = () => type;
    Object.assign(factory, {type});

    return factory as Proto.Factory<any>;
}

export function primitive<ID extends string, T extends Graph.Primitive>(
    args: Omit<Proto.Type<ID, "primitive", T>, "kind">,
): Proto.Factory<Proto.Primitive<ID, T>> {
    return proto({
        kind: "primitive",
        ...args,
    });
}

export function complex<ID extends string, T, O extends Graph.Primitive>(
    args: Omit<Proto.Complex<ID, T, O>, "kind">,
): Proto.Factory<Proto.Complex<ID, T, O>> {
    return proto({
        kind: "complex",
        ...args,
    });
}
export function nullable<C extends Proto.Any>(child: C): Proto.Referenced<Proto.NullishType<C>>;
export function nullable<P extends Proto.Any, G extends Graph<any>, K extends KeyOf<G, string>, S extends Rec, C>(
    child: P,
    resolve: (args: Proto.ResolveArgs<G, K, S, C>) => Nullable<Proto.InferType<P>>,
): Proto.NodeDef<G, K, S, Proto.NullishType<P>, Nullable<Proto.InferType<P>>, C>;
export function nullable<C extends Proto.Any>(child: C, resolve?: any): any {
    const proto: Proto.NullishType<C> = {
        kind: "null",
        name: "null",
        validate: (value) => isNullable(value) || child.validate(value),
        child,
    };

    const type = referenced(proto);

    return resolve
        ? {
              type,
              resolve,
          }
        : type;
}

export function array<C extends Proto.Any>(child: C): Proto.Referenced<Proto.ArrayType<C>>;
export function array<P extends Proto.Any, G extends Graph<any>, K extends KeyOf<G, string>, S extends Rec, C>(
    child: P,
    resolve: (args: Proto.ResolveArgs<G, K, S, C>) => Proto.InferType<P>[],
): Proto.NodeDef<G, K, S, Proto.ArrayType<P>, Proto.InferType<P>[], C>;
export function array<C extends Proto.Any>(child: C, resolve?: any): any {
    const proto: Proto.ArrayType<C> = {
        kind: "array",
        name: `array(${child.name})`,
        validate: (value): value is Proto.InferType<C> => Array.isArray(value) && value.every((v) => child.validate(v)),
        child,
    };

    const type = referenced(proto);

    return resolve
        ? {
              type,
              resolve,
          }
        : type;
}

export function self<G extends Graph<any>>(): Proto.Referenced<Proto.SelfReference<G>>;
export function self<G extends Graph<any>, K extends KeyOf<G, string>, S extends Rec, C>(
    resolve: (args: Proto.ResolveArgs<G, K, S, C>) => NoInfer<S>,
): Proto.NodeDef<G, K, S, Proto.SelfReference<G>, S, C>;
export function self<G extends Graph<any>>(resolve?: any): any {
    const proto: Omit<Proto.SelfReference<G>, "$"> = {
        kind: "self",
        name: "self",
        validate: (_): _ is G => true,
    };

    const type = referenced(proto);

    return resolve
        ? {
              type,
              resolve,
          }
        : type;
}

export function getProtoOf<T extends Proto.Any>(factory: Proto.Factory<T>): T {
    return factory.type;
}

// "graph" | "args" | "complex" | "primitive" | "array" | "null" | "self"
export function isProto<ID extends string, T>(
    value: unknown,
    kind: "complex",
): value is Proto.Complex<ID, T, Graph.Primitive>;
export function isProto<ID extends string, T extends Graph.Primitive>(
    value: unknown,
    kind: "primitive",
): value is Proto.Primitive<ID, T>;
export function isProto<ID extends string, G extends Graph<any>, S extends Rec, C = never>(
    value: unknown,
    kind: "graph",
): value is Proto.GraphNode<ID, G, S, C>;
export function isProto<ID extends string, A extends Args<any>>(
    value: unknown,
    kind: "args",
): value is Proto.ArgsNode<ID, A>;
export function isProto<C extends Proto.Any>(value: unknown, kind: "null"): value is Proto.NullishType<C>;
export function isProto<C extends Proto.Any>(value: unknown, kind: "array"): value is Proto.ArrayType<C>;
export function isProto(value: unknown): value is Proto.Any;
export function isProto(value: unknown, kind?: Proto.Kind): value is Proto.Any {
    const isValidProto = object.is(value) && has(value, "kind", "name", "validate");

    return kind ? isValidProto && kind === value.kind : isValidProto;
}
