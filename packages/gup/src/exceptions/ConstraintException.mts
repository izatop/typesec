import type {Constraint} from "../constraints.mts";

export class ConstraintException extends Error {
    constructor(
        readonly issue: Constraint.Issue,
        readonly issues: Constraint.Issue[],
    ) {
        super(issue.message);
    }
}
