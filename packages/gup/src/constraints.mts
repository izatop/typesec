import {invoke} from "@typesec/the/fn";
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

    export type Issue = Metadata & {
        message: string;
    };
}

export const defaultConstraintMessage = (meta: Constraint.Metadata): string => `The type ${meta.id} validation failed`;

export function constraints<T>(...rules: Constraint.Rule<T>[]): Constraints<T> {
    return {
        rules,
        assert(value, meta) {
            const issues: Constraint.Issue[] = [];
            for (const rule of rules) {
                const validationResult = rule.validate(value, meta);
                if (validationResult !== true) {
                    const message = validationResult || (rule.message ?? defaultConstraintMessage);

                    issues.push({
                        ...meta,
                        message: invoke(message, meta, value),
                    });
                }
            }

            const [issue] = issues;
            if (issue) {
                throw new ConstraintException(issue, issues);
            }
        },
    };
}
