import {assert} from "@typesec/the/assert";
import object from "@typesec/the/object";
import type {Rec} from "@typesec/the/type";
import {AssertionError} from "node:assert";
import type {ConstraintException} from "./exceptions/ConstraintException.mts";
import {proto, type Proto} from "./proto.mts";

export namespace Composer {
    export type PackageScalar<T> = {
        type: Proto.Scalar<string, Proto.ScalarKind, T>;
        value: T;
        defect?: never;
    };

    export type PackageCodec<T> = {
        type: Proto.Codec<string, T, any>;
        value: T;
        defect?: never;
    };

    export type DistributeValue<T> = T extends unknown ? Any<T> : never;

    export type PackageList<T> = {
        type: Proto.List<T>;
        value: (DistributeValue<T> | Defect)[];
        defect?: never;
    };

    export type AsTuple<T> = {[K in keyof T]: Any<T[K]>};

    export type PackageTuple<T> = {
        type: Proto.Tuple<T>;
        value: AsTuple<T>;
        defect?: never;
    };

    export type PackageUnion<T> = {
        type: Proto.Union<T>;
        value: DistributeValue<T>;
        defect?: never;
    };

    export type PackageMaybe<T> = {
        type: Proto.Maybe<T>;
        value: Any<T> | null;
        defect?: never;
    };

    export type DistributeRec<T> = T extends Rec<string, any> ? {[K in keyof T]: Any<T[K]>} : {};
    export type PackageComplex<T> = {
        type: Proto.Complex<string, T>;
        value: DistributeRec<T>;
        defect?: never;
    };

    export type Defect = {
        type: Proto.Any | null;
        input: unknown;
        defect: true;
        reason: ConstraintException | AssertionError | Error | unknown;
    };

    export type ResultShape<T> = {
        string: PackageScalar<T>;
        boolean: PackageScalar<T>;
        number: PackageScalar<T>;
        union: PackageUnion<T>;
        tuple: PackageTuple<T>;
        array: PackageList<T>;
        maybe: PackageMaybe<T>;
        complex: PackageComplex<T>;
        codec: PackageCodec<T>;
    };

    export type Select<K, T> = K extends keyof ResultShape<T> ? ResultShape<T>[K] | Defect : never;

    export type Any<T = any> =
        | PackageScalar<T>
        | PackageCodec<T>
        | PackageUnion<T>
        | PackageTuple<T>
        | PackageList<T>
        | PackageMaybe<T>
        | PackageComplex<T>
        | PackageCodec<T>
        | Defect;
}

class Composer {
    public compose<T>(type: Proto.List<T>, input: unknown): Promise<Composer.Select<"array", T>>;
    public compose<T>(type: Proto.Union<T>, input: unknown): Promise<Composer.Select<"union", T>>;
    public compose<T>(type: Proto.Tuple<T>, input: unknown): Promise<Composer.Select<"tuple", T>>;
    public compose<T>(type: Proto.Maybe<T>, input: unknown): Promise<Composer.Select<"maybe", T>>;
    public compose<T>(type: Proto.Complex<string, T>, input: unknown): Promise<Composer.Select<"complex", T>>;
    public compose<T>(type: Proto.Codec<string, T>, input: unknown): Promise<Composer.Select<"codec", T>>;
    public compose<T, K extends Proto.ScalarKind>(
        type: Proto.Scalar<string, K, T>,
        input: unknown,
    ): Promise<Composer.Select<K, T>>;
    public async compose(type: Proto.Usable, input: unknown): Promise<Composer.Any> {
        try {
            switch (type.kind) {
                case "string":
                case "boolean":
                case "number":
                    return await this.composeScalar(type, input);

                case "codec":
                    return await this.composeCodec(type, input);

                case "union":
                    return await this.composeUnion(type, input);

                case "maybe":
                    return await this.composeMaybe(type, input);

                case "array":
                    return await this.composeList(type, input);

                case "complex":
                    return await this.composeComplex(type, input);

                case "tuple":
                    return await this.composeTuple(type, input);

                default:
                    throw new AssertionError({message: "ASSERT_WRONG_TYPE_KIND"});
            }
        } catch (reason) {
            return {
                type,
                input,
                reason,
                defect: true,
            };
        }
    }

    public async composeScalar<T>(
        type: Proto.Scalar<string, Proto.ScalarKind, T>,
        value: unknown,
    ): Promise<Composer.PackageScalar<T>> {
        assert(type.isKind(value), `ASSERT_WRONG_VALUE_KIND`);
        assert(type.isValid(value), `ASSERT_WRONG_VALUE`);

        return {type, value};
    }

    public async composeList<T>(type: Proto.List<T>, input: unknown): Promise<Composer.PackageList<T>> {
        assert(type.isKind(input), `ASSERT_WRONG_VALUE`);

        const result = await Promise.all(input.map((item) => this.#validateList<T>(type, item)));

        return {
            type,
            value: result,
        };
    }

    public async composeTuple<T>(type: Proto.Tuple<T>, input: unknown): Promise<Composer.PackageTuple<T>> {
        assert(type.isKind(input), `ASSERT_WRONG_VALUE`);
        assert(type.subject.length === input.length, "ASSERT_WRONG_TUPLE_LENGHT");

        const combined = type.subject.map((s, index) => [s, input[index]] as const);
        const result = await Promise.all(combined.map(([s, item]) => this.compose(s, item)));

        return {
            type,
            value: result as Composer.AsTuple<T>,
        };
    }

    public async composeUnion<T>(type: Proto.Union<T>, input: unknown): Promise<Composer.PackageUnion<T>> {
        assert(type.isKind(input), `ASSERT_WRONG_VALUE`);

        const subject = type.subject.find((s) => s.isKind(input));
        assert(subject, "ASSERT_CANNOT_SELECT_SUBJECT");

        return {
            type,
            value: (await this.compose(subject, input)) as Composer.DistributeValue<T>,
        };
    }

    public async composeComplex<T>(
        type: Proto.Complex<string, T>,
        input: unknown,
    ): Promise<Composer.PackageComplex<T>> {
        assert(type.isKind(input), `ASSERT_WRONG_VALUE`);

        const result = await object.fromAsyncEntries(
            object.toEntries(type.members).map(([key, member]) => [key, this.compose(member, input[key])]),
        );

        return {
            type,
            value: result as Composer.DistributeRec<T>,
        };
    }

    public async composeMaybe<T>(type: Proto.Maybe<T>, input: unknown): Promise<Composer.PackageMaybe<T>> {
        assert(type.isKind(input), `ASSERT_WRONG_VALUE`);

        return {
            type,
            value: type.isValid(input) ? null : await this.compose(type.subject, input),
        };
    }

    public async composeCodec<T>(type: Proto.Codec<string, T>, value: unknown): Promise<Composer.PackageCodec<T>> {
        assert(proto.is<T>(type, "codec"), "ASSERT_WRONG_VALUE_KIND");
        assert(type.isKind(value), `ASSERT_WRONG_VALUE`);

        return {type, value};
    }

    async #validateList<T>(
        type: Proto.List<T>,
        input: unknown,
    ): Promise<Composer.DistributeValue<T> | Composer.Defect> {
        try {
            const subject = type.subject.find((s) => s.isKind(input));
            assert(subject, "ASSERT_CANNOT_SELECT_SUBJECT");

            return (await this.compose(subject, input)) as Promise<Composer.DistributeValue<T>>;
        } catch (reason) {
            return this.createDefect(null, input, reason);
        }
    }

    createDefect(type: Proto.Any | null, input: unknown, reason: unknown): Composer.Defect {
        return {
            type,
            input,
            reason,
            defect: true,
        };
    }
}

export const composer = new Composer();
export const compose = composer.compose.bind(composer);
