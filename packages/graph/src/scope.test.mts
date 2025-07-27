import {describe, expect, test} from "bun:test";
import {graph} from "./graph.mts";
import type {Graph} from "./interfaces.mts";
import {scalars} from "./scalars.mts";
import {scope} from "./scope.mts";

describe("scope(node, resolver)", () => {
    test("should create a scope", async () => {
        type G = Graph<{name: string}>;
        const Node = graph<G, {name: string; id: number}>("T", {name: scalars.string});
        const main = scope(Node, () => ({id: 1, name: "foo"}));

        expect(main.resolve({})).toEqual({id: 1, name: "foo"});
    });
});
