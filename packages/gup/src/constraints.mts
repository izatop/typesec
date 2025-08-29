import {is} from "@typesec/the/fn";
import type {Fn} from "@typesec/the/type";
import {ConstraintException} from "./exceptions/ConstraintException.mts";
import type {Proto} from "./proto.mts";

export type Constraints<T> = {
    rules: Constraint.Rule<T>[];
    assert: (value: T, meta: Constraint.Metadata) => void;
};

export namespace Constraint {
    export type Metadata = {
        id: string;
        kind: Proto.Kind;
    };

    export type Rule<T> = {
        message?: Constraint.Message;
        validate(value: T, meta: Constraint.Metadata): boolean | string;
    };

    export type Message = string | Fn<[Metadata, value: unknown], string>;

    export type FailState = Metadata & {
        message: string;
        actual: string;
    };
}

export const defaultConstraintMessage = (meta: Constraint.Metadata): string => `The type ${meta.id} validation failed`;

export function constraints<T>(...rules: Constraint.Rule<T>[]): Constraints<T> {
    return {
        rules,
        assert(value, meta) {
            const fails: Constraint.FailState[] = [];
            for (const rule of rules) {
                const actual = rule.validate(value, meta);
                if (actual !== true) {
                    const describe = is(actual, "string") ? actual : (rule.message ?? defaultConstraintMessage);
                    fails.push({
                        ...meta,
                        message: is(describe, "function") ? describe(meta, value) : describe,
                        actual: typeof value,
                    });
                }
            }

            const [first] = fails;
            if (first) {
                throw new ConstraintException(first, fails);
            }
        },
    };
}
