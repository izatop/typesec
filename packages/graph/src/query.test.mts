import {describe, expect, test} from "bun:test";
import {args} from "./args.mts";
import {graph} from "./graph.mts";
import type {Args, Graph, Node} from "./interfaces.mts";
import {array} from "./proto.mts";
import {query} from "./query.mts";
import {scalars} from "./scalars.mts";
import {scope} from "./scope.mts";

describe("query()", () => {
    test("should resolve primitives", async () => {
        type S = {i: number; f: number; s: string; b: boolean};
        type G = Graph<S>;
        const Node = graph<G, S>("Test", {
            i: scalars.int,
            f: scalars.float,
            s: scalars.string,
            b: scalars.boolean,
        });

        const entry = scope(Node, () => ({i: 1, f: 1.1, b: true, s: "s"}));
        const res = await query(entry, {
            i: true,
            f: true,
            b: true,
            s: true,
        });

        expect(res).toMatchSnapshot();
    });

    test("should resolve virtual nodes", async () => {
        type G = Graph<{random: number}>;
        const value = Math.random();
        const Node = graph<G, {}>("T", {
            random: {type: scalars.float(), resolve: () => value},
        });

        const entry = scope(Node, () => ({id: 1}));
        const res = await query(entry, {random: true});
        expect(res.random).toBe(value);
    });

    test("should resolve complex type", async () => {
        const value = new Date();

        type S = {date: Date};
        type G = Graph<{date: Node<Date>}>;
        const Node = graph<G, S>("T", {
            date: {type: scalars.datetime()},
        });

        const entry = scope(Node, () => ({date: value}));
        const res = await query(entry, {date: true});
        expect(res.date).toBe(value);
    });

    test("should support args", async () => {
        type A = Args<{x: number[]}>;
        type G = Graph<{adds: Node<number, A>}>;
        const NodeArgs = args<A>("A", {x: {type: array(scalars.int())}});
        const Node = graph<G, {}>("T", {
            adds: {
                args: NodeArgs,
                type: scalars.int(),
                resolve: ({args}) => args.x.reduce((l, r) => l + r, 0),
            },
        });

        const entry = scope(Node, () => ({n1: 1}));
        const res = await query(entry, {adds: [{x: [1, 2, 3]}]});
        expect(res.adds).toEqual(1 + 2 + 3);
    });

    test("should query in scope", async () => {
        type S = {n1: number};
        type G = Graph<{n1: number; n2: number}>;
        const Node = graph<G, S>("T", {
            n1: {type: scalars.int()},
            n2: {
                type: scalars.int(),
                resolve: async ({subquery}) => {
                    const {n1} = await subquery.query({n1: 1});

                    return n1 + 1;
                },
            },
        });

        const entry = scope(Node, () => ({n1: 1}));
        const res = await query(entry, {n1: true, n2: true});
        expect(res).toEqual({n1: 1, n2: 2});
    });

    test("should run subquery", async () => {
        type S = {n1: number};
        type G = Graph<{n1: number; n2: number}>;
        const Node = graph<G, S>("T", {
            n1: {type: scalars.int()},
            n2: {
                type: scalars.int(),
                resolve: async ({subquery}) => {
                    const {n1} = await subquery.query({n1: 1});

                    return n1 + 1;
                },
            },
        });

        const entry = scope(Node, () => ({n1: 1}));
        const res = await query(entry, {n1: true, n2: true});
        expect(res).toEqual({n1: 1, n2: 2});
    });

    test("should run deep query", async () => {
        const id = 1;
        const name = "B. Node";

        type A = {};
        type B = {id: number; name: string};
        type GA = Graph<{child: Node<GB>; children: Node<GB[]>}>;
        type GB = Graph<B>;
        const NB = graph<GB, B>("B", {id: scalars.int, name: scalars.string});
        const NA = graph<GA, A>("A", {
            child: {
                type: NB,
                resolve: () => {
                    return {id, name};
                },
            },
            children: {
                type: array(NB),
                resolve: () => [{id, name}],
            },
        });

        const s = scope(NA, {});

        const res = await s.query({child: [{name: 1}], children: [{id: 1}]});
        expect(res).toEqual({child: {name}, children: [{id}]});

        const aliased = await s.query({child: {a: [{name: 1}], b: [{id: 1}]}});
        expect(aliased).toEqual({child: {a: {name}, b: {id}}});
    });
});
