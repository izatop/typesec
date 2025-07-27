import {assert} from "@typesec/core";
import {isObject, object, toEntries, type Rec} from "@typesec/the";
import type {Graph, Node, Proto} from "./interfaces.mts";
import {isProto} from "./proto.mts";

export function graph<G extends Graph<any>, S extends Rec, ID extends string = string, C = never>(
    name: ID,
    members: Node.Make<G, S, C>,
): Proto.GraphNode<ID, G, S, C> {
    return {
        name,
        members,
        kind: "graph",
        keys: () => object.keys(members),
        has: (key) => object.hasKeyOf(members, key),
        validate: (value): value is Graph.Infer<G> => {
            const entries = toEntries(members);
            if (!isObject(value)) {
                return false;
            }

            for (const [key, {type}] of entries) {
                assert(isProto(type), `@TODO [${name}.${key}] isProto(member)`);
                assert(type.validate(value[key]), `@TODO [${name}.${key}] validate(${value[key]})`);
            }

            return true;
        },
    };
}
