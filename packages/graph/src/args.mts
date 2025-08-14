import {isObject, object} from "@typesec/the";
import {assert} from "@typesec/the/assert";
import type {Args, Node, Proto} from "./interfaces.mts";
import {isProto} from "./proto.mts";

export function args<A extends Args<any>, ID extends string = string>(
    name: ID,
    members: Node.MembersArgs<A>,
): Proto.ArgsNode<ID, A> {
    return {
        name,
        members,
        $: {} as A,
        kind: "args",
        keys: () => object.keys(members),
        has: (key) => object.hasKeyOf(members, key),
        validate: (value): value is A => {
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
