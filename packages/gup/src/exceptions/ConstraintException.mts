import type {Constraint} from "../constraints.mts";

export class ConstraintException extends Error {
    constructor(
        readonly first: Constraint.FailState,
        readonly all: Constraint.FailState[],
    ) {
        super(first.message);
    }
}
