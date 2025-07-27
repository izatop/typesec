import {isXEqualToY, isXExtendsOfY, type Exact, type Nullish, type Prop} from "@typesec/the";
import {describe, expect, test} from "bun:test";
import type {Args, Graph, Node, Proto, Query} from "./index.mts";

describe("Args<T>", () => {
    test("should fail", () => {
        // @ts-expect-error
        type G = Args<{test: bigint}>;

        expect(isXEqualToY<Prop<G, "test">, never>(true)).toBeTrue();
    });

    test("should extends Graph<T>", () => {
        type G = Args<{test: boolean}>;
        type S = Graph<{test: boolean}>;

        expect(isXExtendsOfY<G, S>(true)).toBeTrue();
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

describe("Node<T, A>", () => {
    test("should wrap with primitives", () => {
        type B = Node.Wrap<boolean>;
        type S = Node.Wrap<string>;
        type N = Node.Wrap<number>;
        type NW = Node.Wrap<Node<number>>;

        expect(isXEqualToY<B, Proto.Primitive<any, boolean>>(true)).toBeTrue();
        expect(isXEqualToY<S, Proto.Primitive<any, string>>(true)).toBeTrue();
        expect(isXEqualToY<N, Proto.Primitive<any, number>>(true)).toBeTrue();
        expect(isXEqualToY<NW, Proto.Primitive<any, number>>(true)).toBeTrue();
    });

    test("should wrap a complex values", () => {
        type W = Node.Wrap<Node<Date>>;

        expect(isXEqualToY<W, Proto.Complex<any, Date, any>>(true)).toBeTrue();
    });

    test("should composite values", () => {
        type TestNull = Node.Wrap<string | null>;
        type TestArray = Node.Wrap<string[]>;
        type TestArrayOrNull = Node.Wrap<string[] | null>;
        type TestNullableArray = Node.Wrap<Nullish<string>[]>;

        type ArrayOrNull = Proto.NullishType<Proto.ArrayType<Proto.Primitive<any, string>>>;
        type NullableArray = Proto.ArrayType<Proto.NullishType<Proto.Primitive<any, string>>>;

        expect(isXEqualToY<TestNull, Proto.NullishType<Proto.Primitive<any, string>>>(true)).toBeTrue();
        expect(isXEqualToY<TestArray, Proto.ArrayType<Proto.Primitive<any, string>>>(true)).toBeTrue();
        expect(isXEqualToY<TestArrayOrNull, ArrayOrNull>(true)).toBeTrue();
        expect(isXEqualToY<TestNullableArray, NullableArray>(true)).toBeTrue();
    });

    test("should wrap a graph", () => {
        type G = Graph<{test: string}>;
        type W = Node.Wrap<Node<G>>;

        expect(isXEqualToY<W, Proto.GraphNode<any, G, any, never>>(true)).toBeTrue();
    });

    test("should wrap an args", () => {
        type A = Args<{test: string}>;
        type W = Node.WrapArgs<A>;

        expect(isXEqualToY<W, Proto.ArgsNode<any, A>>(true)).toBeTrue();
    });

    test("should make a node", () => {
        type C = never;
        type S = {n: number};
        type G = Graph<{
            n: number;
        }>;

        type N = Node.Make<G, S, C>;

        expect(isXEqualToY<N["n"], Node.Member<Node.Wrap<G["n"]>, G, "n", S, C>>(true)).toBeTrue();
    });

    test("should mark a resolver as an optional", () => {
        type C = never;
        type S = {n1: number};
        type G = Graph<{
            n1: number;
            n2: string;
        }>;

        type N = Node.Make<G, S, C>;
        type N1 = N["n1"];
        type N2 = N["n2"];
        type R1 = Node.MemberType<Proto.Primitive<any, number>> & Node.OptionalResolver<G, "n1", S, C>;
        type R2 = Node.MemberType<Proto.Primitive<any, string>> & Node.Resolver<G, "n2", S, C>;

        expect(isXEqualToY<N1, R1>(true)).toBeTrue();
        expect(isXEqualToY<N2, R2>(true)).toBeTrue();
    });

    test("should pass args", () => {
        type C = {v: number};
        type S = {id: number};
        type G = Graph<{
            avg: Node<number, Args<{values: number[]}>>;
        }>;

        type N = Node.Make<G, S, C>;
        type TestResolve = N["avg"]["resolve"];
        expect(isXEqualToY<Parameters<TestResolve>[0]["args"], {values: number[]}>(true)).toBeTrue();
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

        // @ts-expect-error
        type Q2 = Run<G, {a: [{z: 1}]}>;

        expect(isXEqualToY<Q1, {a: [{b: 1}]}>(true)).toBeTrue();
        expect(isXEqualToY<Q2, never>(true)).toBeTrue();
    });

    test("should support args", () => {
        type G = Graph<{test: Node<number, Args<{adds: number}>>}>;
        type Q1 = Run<G, {test: {first: [{adds: 10}]; second: [{adds: 20}]}}>;

        // @ts-expect-error
        type Q2 = Run<G, {test: [{z: 1}]}>;

        expect(isXEqualToY<Q1, {test: {first: [{adds: 10}]; second: [{adds: 20}]}}>(true)).toBeTrue();
        expect(isXEqualToY<Q2, never>(true)).toBeTrue();
    });
});
