import type {Proto, Query} from "./interfaces.mts";
import type {Scope} from "./scope/Scope.mts";

export type AssertReason = {
    property: string;
    message: string;
};

export type AssertionDetails = {
    query?: Query<any>;
    node?: Proto.GraphNode<any, any, any, any>;
    scope?: Scope<any, any, any>;
    proto?: Proto.Any;
    reason?: AssertReason[];
    source?: unknown;
    message?: string;
};

export class GraphAssertion extends Error {
    constructor(public readonly details: AssertionDetails) {
        super();
    }
}

export function assert(expression: unknown, details: AssertionDetails): asserts expression {
    if (!expression) {
        throw new GraphAssertion(details);
    }
}
