import {type Rec} from "@typesec/the";
import type {Graph, Node, Proto} from "./interfaces.mts";
import {Scope} from "./scope/Scope.mts";

export function scope<G extends Graph<any>, S extends Rec, C = never>(
    node: Proto.GraphNode<any, G, S, C>,
    resolve: Node.ScopeResolve<S, C>,
): Scope<G, S, C> {
    return new Scope(node, resolve);
}
