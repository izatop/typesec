import {isXEqualToY, isXExtendsOfY, type Exact, type Nullish, type Prop} from "@typesec/the";
import type {DeFnify, Fn, Promisify} from "@typesec/the/type";
import {describe, expect, test} from "bun:test";
import type {Args, Graph, Node, Query} from "./index.mts";
import type {Proto} from "./interfaces.mts";

describe("Args<T>", () => {
    test("should fail", () => {
        // @ts-expect-error
        type G = Args<{test: bigint}>;

        expect(isXEqualToY<Prop<G, "test">, never>(true)).toBeTrue();
    });

    test("should not extend Graph<T>", () => {
        type A = Args<{test: boolean}>;
        type G = Graph<{test: boolean}>;

        // @ts-expect-error
        expect(isXExtendsOfY<A, G>(true)).toBeTrue();
    });

    test("should extend strict Node<T, never>", () => {
        // @ts-expect-error
        type A = Args<{test: Node<bigint, G>}>;

        expect(isXEqualToY<Prop<A, "test">, never>(true)).toBeTrue();
    });
});

describe("Graph<T>", () => {
    test("should fail", () => {
        // @ts-expect-error
        type G = Graph<{test: bigint}>;

        expect(isXEqualToY<Prop<G, "test">, never>(true)).toBeTrue();
    });

    test("primitives should work", () => {
        type G = Graph<{
            number: number;
            string: string;
            boolean: boolean;
        }>;

        expect(isXEqualToY<Prop<G, "number">, number>(true)).toBeTrue();
        expect(isXEqualToY<Prop<G, "string">, string>(true)).toBeTrue();
        expect(isXEqualToY<Prop<G, "boolean">, boolean>(true)).toBeTrue();
    });

    test("array should work", () => {
        type G = Graph<{a: number[]; n: Node<Date[]>}>;

        expect(isXEqualToY<Prop<G, "a">, number[]>(true)).toBeTrue();
        expect(isXEqualToY<Prop<G, "n">, Node<Date[]>>(true)).toBeTrue();
    });

    test("should validate a node", () => {
        expect(isXEqualToY<Graph.Validate<string>, string>(true)).toBeTrue();
        expect(isXEqualToY<Graph.Validate<number>, number>(true)).toBeTrue();
        expect(isXEqualToY<Graph.Validate<boolean>, boolean>(true)).toBeTrue();
        expect(isXEqualToY<Graph.Validate<Node<Date>>, Node<Date>>(true)).toBeTrue();
        expect(isXEqualToY<Graph.Validate<bigint>, never>(true)).toBeTrue();
    });

    test("should validate args", () => {
        expect(isXEqualToY<Graph.ValidateArgs<string>, string>(true)).toBeTrue();
        expect(isXEqualToY<Graph.ValidateArgs<number>, number>(true)).toBeTrue();
        expect(isXEqualToY<Graph.ValidateArgs<boolean>, boolean>(true)).toBeTrue();
        expect(isXEqualToY<Graph.ValidateArgs<Node<Date>>, Node<Date>>(true)).toBeTrue();
        expect(isXEqualToY<Graph.ValidateArgs<bigint>, never>(true)).toBeTrue();

        type G = Args<{}>;
        expect(isXEqualToY<Graph.ValidateArgs<Node<Date, G>>, never>(true)).toBeTrue();
    });

    test("should remove optionals", () => {
        type G = Graph<{test?: string}>;

        expect(isXEqualToY<Prop<G, "test">, string>(true)).toBeTrue();
    });

    test("should support graph", () => {
        type S = Graph<{}>;
        type G = Graph<{s: Node<S>; a: Node<S[]>}>;

        expect(isXEqualToY<Prop<G, "s">, Node<S>>(true)).toBeTrue();
        expect(isXEqualToY<Prop<G, "a">, Node<S[]>>(true)).toBeTrue();
    });

    test("should support nullish", () => {
        type S = Graph<{}>;
        type G = Graph<{
            test: Nullish<string>;
            testArray: Nullish<number[]>;
            testNode: Node<Date | null>;
            testNodeArray: Node<Date[] | null>;
            testNullableNodeArray: Node<Nullish<Date>[] | null>;
            testGraph: Node<S | null>;
            testGraphArray: Node<S[] | null>;
            testNullableGraphArray: Node<Nullish<S>[] | null>;
        }>;

        expect(isXEqualToY<Prop<G, "test">, string | null>(true)).toBeTrue();
        expect(isXEqualToY<Prop<G, "testArray">, number[] | null>(true)).toBeTrue();
        expect(isXEqualToY<Prop<G, "testNode">, Node<Date | null>>(true)).toBeTrue();
        expect(isXEqualToY<Prop<G, "testNodeArray">, Node<Date[] | null>>(true)).toBeTrue();
        expect(isXEqualToY<Prop<G, "testNullableNodeArray">, Node<(Date | null)[] | null>>(true)).toBeTrue();
        expect(isXEqualToY<Prop<G, "testGraph">, Node<S | null>>(true)).toBeTrue();
        expect(isXEqualToY<Prop<G, "testGraphArray">, Node<S[] | null>>(true)).toBeTrue();
        expect(isXEqualToY<Prop<G, "testNullableGraphArray">, Node<(S | null)[] | null>>(true)).toBeTrue();
    });

    test("should support recursive references", () => {
        type Y = Graph<{parent: Node<Y>}>;

        expect(isXEqualToY<Y["parent"], Node<Y>>(true)).toBeTrue();
    });

    test("should support cross references", () => {
        type Y = Graph<{x: Node<X>}>;
        type X = Graph<{y: Node<Y>}>;

        expect(isXEqualToY<Y["x"], Node<X>>(true)).toBeTrue();
        expect(isXEqualToY<X["y"], Node<Y>>(true)).toBeTrue();
    });

    test("should support args", () => {
        type GeoGraph = Graph<{
            lat: number;
            lon: number;
        }>;

        type SearchGeoArgs = Args<{term: string}>;
        type SearchGeoGraph = Graph<{
            search: Node<GeoGraph, SearchGeoArgs>;
        }>;

        expect(isXEqualToY<SearchGeoGraph["search"], Node<GeoGraph, SearchGeoArgs>>(true)).toBeTrue();
    });

    test("should fail with inner args", () => {
        type A = Args<{test: Node<string, Args<{}>>}>;

        expect(isXEqualToY<A["test"], never>(true)).toBeTrue();
    });

    test("Extract<Graph> should work", () => {
        type v = number;
        type G = Graph<{
            a: v;
            b: Node<Graph<{c: v}>>;
            d: Node<Nullish<Date>>;
            e: v[];
        }>;

        type E = Graph.Extract<G>;

        expect(isXEqualToY<E, {a: v; b: {c: v}; d: Date | null; e: v[]}>(true)).toBeTrue();
    });
});

describe("Node", () => {
    test("ScopeResolve<S, C>", () => {
        type s = {test: number};
        type n = Node.ScopeResolve<s, never>;
        expect(isXEqualToY<n, s | Fn<[{}], Promisify<s>>>(true)).toBeTrue();
    });

    test("ResolverContext<C>", () => {
        expect(isXEqualToY<Node.ResolverContext<never>, {}>(true)).toBeTrue();
        expect(isXEqualToY<Node.ResolverContext<number>, {context: number}>(true)).toBeTrue();
    });

    test("Unpack<G, K>", () => {
        type g1 = Graph<{node: Node<Date>}>;
        type g2 = Graph<{node: Node<string, Args<{}>>}>;

        expect(isXEqualToY<Node.Unpack<g1, "node">, Date>(true)).toBeTrue();
        expect(isXEqualToY<Node.Unpack<g2, "node">, string>(true)).toBeTrue();
    });

    test("ExtractArgs<G, K>", () => {
        type a = Graph<{b: Node<number, Args<{a: number; b: Node<Args<{c: number}>>}>>}>;

        expect(isXEqualToY<Node.ExtractArgs<a, "b">, {a: number; b: {c: number}}>(true)).toBeTrue();
    });

    test("boolean should resolve Primitive<ID, boolean>", () => {
        type G = Graph<{bool: boolean}>;
        type M = Node.Member<G, "bool", {}, never>;
        type test = DeFnify<M["type"]>;

        expect(isXEqualToY<test, Proto.Primitive<string, boolean>>(true)).toBeTrue();
    });
});

describe("Query<G>", () => {
    type Run<G extends Graph<any>, Q extends Query<G>> = Q & Exact<Q, Query<G>>;

    test("should fail on an unknown key", () => {
        // @ts-expect-error
        type Q = Run<Graph<{test: string}>, {q: true}>;

        expect(isXEqualToY<Q, never>(true)).toBeTrue();
    });

    test("should support a read flag", () => {
        type v = string;
        type G = Graph<{a: v; b: v; c: v; d: v}>;
        type Q = Run<G, {a: true; b: () => false; c: true; d: false}>;

        expect(isXEqualToY<Q, {a: true; b: () => false; c: true; d: false}>(true)).toBeTrue();
    });

    test("should support a dynamic read flag", () => {
        type G = Graph<{test: string}>;
        type Q = Run<G, {test: () => boolean}>;

        expect(isXEqualToY<Q, {test: () => boolean}>(true)).toBeTrue();
    });

    test("should support deep query", () => {
        type G = Graph<{a: Node<Graph<{b: number}>>}>;
        type Q1 = Run<G, {a: [{b: 1}]}>;

        expect(isXEqualToY<Q1, {a: [{b: 1}]}>(true)).toBeTrue();
    });
});
