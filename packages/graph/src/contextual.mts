import {type Rec} from "@typesec/the";
import {graph} from "./graph.mts";
import type {Graph, Node, Proto} from "./interfaces.mts";

export function contextual<C>(): Graph.ContextualFactory<C> {
    return <G extends Graph<any>, S extends Rec, ID extends string = string>(
        name: ID,
        members: Node.Make<G, S, C>,
    ): Proto.GraphNode<ID, G, S, C> => graph(name, members);
}
