import {defnify} from "@typesec/the/fn";
import {describe, expect, it} from "bun:test";
import {array, graph, scalars, type Graph, type Node} from "./index.mts";
import {self} from "./proto.mts";

describe("Schema", () => {
    it("should have a name", () => {
        type G = Graph<{}>;

        const Node = graph<G, {}>("T", {});
        expect(Node.name).toBe("T");
    });

    it("should define a member", () => {
        type G = Graph<{test: number}>;

        const Node = graph<G, {test: number}>("T", {test: scalars.int});
        expect(Node.name).toBe("T");
        expect(Node.members.test.type).toBe(scalars.int.type);
    });

    it("primitive members should work", () => {
        type S = {i: number; f: number; s: string; b: boolean};
        type G = Graph<S>;
        const Node = graph<G, S>("T", {
            i: scalars.int,
            f: scalars.float,
            s: scalars.string,
            b: scalars.boolean,
        });

        expect(Node.members.i.type).toBe(scalars.int.type);
        expect(Node.members.f.type).toBe(scalars.float.type);
        expect(Node.members.s.type).toBe(scalars.string.type);
        expect(Node.members.b.type).toBe(scalars.boolean.type);
    });

    it("should work with array members", () => {
        type S = {test: number[]};
        type G = Graph<S>;
        const type = array(scalars.int());
        const Node = graph<G, S>("T", {
            test: {type},
        });

        expect(Node.members.test.type).toBe(type);
    });

    it("should work with self-references", () => {
        type G = Graph<{parent: Node<G>}>;

        const Node = graph<G, {id: number}>("T", {
            parent: {
                type: self(),
                resolve: () => {
                    return {id: 1};
                },
            },
        });

        expect(defnify(Node.members.parent.type).kind).toBe("self");
    });
});
