import {isObject, object, toEntries, type Rec} from "@typesec/the";
import {assert} from "@typesec/the/assert";
import type {KeyOf} from "@typesec/the/type";
import type {Graph, Node, Proto} from "./interfaces.mts";
import {isProto} from "./proto.mts";

export function graph<G extends Graph<any>, S extends Rec, ID extends string = string, C = never>(
    name: ID,
    members: Node.Members<G, S, C>,
): Proto.GraphNode<ID, G, S, C> {
    const type: Proto.Definition<ID, "graph", G, S, Node.Members<G, S, C>> = {
        name,
        members,
        $: {} as G,
        kind: "graph",
        keys: () => object.keys(members),
        has: (key) => object.hasKeyOf(members, key),
        validate: (value): value is S => {
            if (!isObject(value)) {
                return false;
            }

            const entries = toEntries(members);
            for (const [key, {type}] of entries) {
                assert(isProto(type), `@TODO [${name}.${key}] isProto(member)`);
                assert(type.validate(value[key]), `@TODO [${name}.${key}] validate(${value[key]})`);
            }

            return true;
        },
    };

    function factory(): Proto.GraphNode<ID, G, S, C>;
    function factory<PG extends Graph<any>, PK extends KeyOf<PG, string>, PS extends Rec>(
        resolve: (args: Proto.ResolveArgs<PG, PK, PS, C>) => S,
    ): Proto.GraphNodeDef<ID, G, S, PG, PK, PS, C>;
    function factory(resolve?: any): any {
        return resolve ? {type, resolve} : type;
    }

    return Object.assign(type, factory);
}
