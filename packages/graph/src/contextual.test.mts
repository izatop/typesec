import {describe, expect, test} from "bun:test";
import {contextual} from "./contextual.mts";
import type {Graph} from "./interfaces.mts";
import {query} from "./query.mts";
import {scalars} from "./scalars.mts";
import {scope} from "./scope.mts";

describe("contextual<TContext>()", () => {
    test("should work without context", async () => {
        const app = contextual<{}>();
        const Node = app<Graph<{v: number}>, {}>("Test", {
            v: {
                type: scalars.int(),
                resolve: () => 42,
            },
        });

        const GraphRoot = scope(Node, () => ({}));
        const res = await query(GraphRoot, {v: 1}, {});
        expect(res).toEqual({v: 42});
    });

    test("should create a contextual factory", async () => {
        type G = Graph<{v: number}>;
        type Context = {
            now: () => number;
        };

        const app = contextual<Context>();
        const TestNode = app<G, {}>("Test", {
            v: {
                type: scalars.int(),
                resolve: ({context}) => {
                    return context.now();
                },
            },
        });

        const MyGraph = scope(TestNode, () => ({}));
        const res1 = await query(MyGraph, {v: 1}, {now: () => 1});
        expect(res1).toEqual({v: 1});

        const res2 = await query(MyGraph, {v: 1}, {now: () => 2});
        expect(res2).toEqual({v: 2});

        // @ts-expect-error: Missing `now`
        expect(query(MyGraph, {v: 1}, {})).rejects.toThrowError();
    });
});
