import {has, is, isNullable, isObject} from "@typesec/the";
import type {Graph, Proto} from "./interfaces.mts";

export const ProtoSymbol = Symbol();

export function proto<ID extends string, T, O extends Graph.Primitive>(
    args: Proto.Complex<ID, T, O>,
): Proto.Factory<Proto.Complex<ID, T, O>>;
export function proto<ID extends string, T extends Graph.Primitive, K extends Proto.Kind>(
    args: Proto.Type<ID, T, K>,
): Proto.Factory<Proto.Type<ID, T, K>>;
export function proto(args: Proto.Any): Proto.Factory<any> {
    const factory = () => args;

    Object.assign(factory, {type: args});

    return factory as Proto.Factory<any>;
}

export function primitive<ID extends string, T extends Graph.Primitive>(
    args: Omit<Proto.Type<ID, T, any>, "kind">,
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

export function nullable<C extends Proto.Any>(child: C): Proto.NullishType<C> {
    return {
        kind: "null",
        name: `nullable(${child.name})`,
        validate: (value) => isNullable(value) || child.validate(value),
        child,
    };
}

export function array<C extends Proto.Any>(child: C): Proto.ArrayType<C> {
    return {
        kind: "array",
        name: `array(${child.name})`,
        validate: (value): value is Proto.Infer<C> => Array.isArray(value) && value.every((v) => child.validate(v)),
        child,
    };
}

export function getProtoOf<T extends Proto.Any>(factory: Proto.Factory<T>): T {
    return factory.type;
}

export function isProto(value: unknown): value is Proto.Any {
    return isObject(value) && has(value, "name", "validate") && is(value.validate, "function");
}
