import {assert} from "@typesec/core";
import {isObject, object} from "@typesec/the";
import type {Args, Graph, Node, Proto} from "./interfaces.mts";
import {isProto} from "./proto.mts";

export function args<A extends Args<any>, ID extends string = string>(
    name: ID,
    members: Node.MakeArgs<A>,
): Proto.ArgsNode<ID, A> {
    return {
        name,
        members,
        kind: "args",
        keys: () => object.keys(members),
        has: (key) => object.hasKeyOf(members, key),
        validate: (value): value is Graph.Infer<A> => {
            const entries = Object.entries(members);
            if (!isObject(value)) {
                return false;
            }

            for (const [key, member] of entries) {
                assert(isProto(member), "@TODO isMember(member)");
                assert(member.validate(value[key]), "@TODO member.validate(value)");
            }

            return true;
        },
    };
}
