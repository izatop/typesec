import {assert} from "@typesec/the/assert";
import type {ConstraintException} from "./exceptions/ConstraintException.mts";
import {proto, type Proto} from "./proto.mts";

export namespace Composer {
    export type Package<T> = {
        type: Proto.Any<T>;
        value: T;
    };

    export type PackageArray<T> = {
        type: Proto.List<T>;
        value: Result<T>[];
    };

    export type Defect<T> = {
        type: Proto.Any<T>;
        input: unknown;
        reason: ConstraintException | Error | unknown;
    };

    export type Result<T> = Package<T> | PackageArray<T> | Defect<T>;
}

const composer = {
    compose<T>(type: Proto.Any<T>, input: unknown): Composer.Result<T> {
        try {
            switch (type.kind) {
                case "string":
                case "boolean":
                case "number":
                case "codec":
                case "complex":
                case "nullable":
                    return this.composeAny(type, input);

                case "array":
                    return this.composeArray(type, input);
            }
        } catch (reason) {
            return {
                type,
                input,
                reason,
            };
        }
    },
    composeArray<T>(type: Proto.Any<any>, value: unknown): Composer.PackageArray<T> {
        assert(proto.is(type, "array"), `ASSERT_WRONG_TYPE`);
        assert(type.is(value), `ASSERT_WRONG_VALUE`);

        return {
            type,
            value: value.map((item) => compose(type.element, item)),
        };
    },

    composeAny<T>(type: Proto.Any<T>, value: unknown): Composer.Package<T> {
        assert(type.is(value), `ASSERT_WRONG_VALUE`);

        return {type, value};
    },
};

export function compose<T>(type: Proto.Any<T>, input: unknown): Composer.Result<T> {
    return composer.compose<T>(type, input);
}
