import type {Fn, Rec} from "@typesec/the/type";
import type {Constraints} from "./constraints.mts";
import type {Primitive} from "./interfaces.mts";

export namespace Proto {
    export type PrimitiveKind = "primitive";
    export type CompositeKind = "array" | "nullable";
    export type Kind = PrimitiveKind | CompositeKind | "codec" | "complex";

    export type ListId = "List<T>";
    export type NullableId = "Nullable<T>";

    export type Initial<T> = Omit<T, "kind">;

    export type Infer<P> = P extends {is: Is<infer T>} ? T : never;

    export type WithConstraints<P> = P & Constraints<Infer<P>>;

    export type Is<T> = (value: unknown) => value is T;

    export type Base<ID extends string, K extends Kind, T> = {
        id: ID;
        kind: K;
        is: Is<T>;
    };

    export type JSONValue<ID extends string, T extends Primitive> = Base<ID, PrimitiveKind, T>;

    export type Codec<ID extends string, T> = Base<ID, "codec", T> & {
        encode: Fn<[T], string>;
        decode: Fn<[string], T>;
    };

    export type List<T, E extends Base<string, Kind, T>> = Base<ListId, "array", T[]> & {
        element: E;
    };

    export type Nullable<T, S extends Base<string, Kind, T>> = Base<NullableId, "nullable", T | null | undefined> & {
        type: S;
    };

    export type Complex<ID extends string, T extends Rec> = Base<ID, "complex", T>;

    export type Factory<P extends Base<string, Kind, any>> = P & FactoryFn<P>;

    export type FactoryFn<P extends Base<string, Kind, any>> = {
        (constraints: Constraints<Infer<P>>): WithConstraints<P>;
        (): P;
    };
}

export const proto = {
    codec<ID extends string, T>(initial: Omit<Proto.Codec<ID, T>, "kind">): Proto.Factory<Proto.Codec<ID, T>> {
        const type = {kind: "codec", ...initial} as Proto.Codec<ID, T>;
        function factory(): Proto.Codec<ID, T>;
        function factory(constraints: Constraints<T>): Proto.WithConstraints<Proto.Codec<ID, T>>;
        function factory(constraints?: Constraints<T>): Proto.Codec<ID, T> | Proto.WithConstraints<Proto.Codec<ID, T>> {
            return constraints ? {...type, ...constraints} : type;
        }

        return Object.assign(type, factory);
    },
    primitive<ID extends string, T extends Primitive>(
        initial: Omit<Proto.JSONValue<ID, T>, "kind">,
    ): Proto.Factory<Proto.JSONValue<ID, T>> {
        const type = {kind: "primitive", ...initial} as Proto.JSONValue<ID, T>;
        function factory(): Proto.JSONValue<ID, T>;
        function factory(constraints: Constraints<T>): Proto.WithConstraints<Proto.JSONValue<ID, T>>;
        function factory(
            constraints?: Constraints<T>,
        ): Proto.JSONValue<ID, T> | Proto.WithConstraints<Proto.JSONValue<ID, T>> {
            return constraints ? {...type, ...constraints} : type;
        }

        return Object.assign(type, factory);
    },
};
