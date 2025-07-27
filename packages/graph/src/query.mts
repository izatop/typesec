import {type IsNever, type Rec} from "@typesec/the";
import type {Graph, Query} from "./interfaces.mts";
import {Scope, type ScopeQueryArgs} from "./scope/Scope.mts";

export type QueryArgs<G extends Graph<any>, Q extends Query<G>, S extends Rec, C> =
    IsNever<C> extends false ? [scope: Scope<G, S, C>, query: Q, context: C] : [scope: Scope<G, S, C>, query: Q];

export async function query<G extends Graph<any>, Q extends Query<G>, S extends Rec, C>(
    ...[scope, ...args]: QueryArgs<G, Q, S, C>
): Promise<Query.Result<G, Q>> {
    return scope.query(...(args as ScopeQueryArgs<Q, C>));
}
