import {isXEqualToY, isXExtendsOfY} from "@typesec/the";
import assert from "node:assert";
import test, {describe} from "node:test";
import type {Box, Input, Mutator, Spec, SpecOf} from "../../src/spec.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("Spec", () => {
    test("Nullable", () => {
        type D1 = {nullable: number | null};
        type S1 = SpecOf<D1, {nullable: number | null}>;

        assert.ok(isXExtendsOfY<Spec.GetType<S1, "nullable">, null>(true));
    });

    test("Optional", () => {
        type D1 = {optional?: number};
        type S1 = SpecOf<D1, {optional?: number}>;

        assert.ok(isXExtendsOfY<Spec.GetType<S1, "optional">, undefined>(true));
    });

    test("Specification Equality", () => {
        type D1 = {key: string};
        type T1 = Spec<D1>;
        type T2 = Spec<{key: string}>;

        assert.ok(isXEqualToY<T1, T2>(true));
        assert.ok(isXEqualToY<Spec.Get<T1, "key">, Box<D1, never, "key">>(true));
        assert.ok(isXEqualToY<Spec.Get<T2, "key">, Box<D1, never, "key">>(true));

        assert.ok(isXEqualToY<Spec.GetSpec<T1, "key">, D1>(true));
        assert.ok(isXEqualToY<Spec.GetType<T1, "key">, string>(true));
        assert.ok(isXEqualToY<Spec.GetValue<T1, "key">, never>(true));

        type T3 = SpecOf<D1, {key: string}>;
        assert.ok(isXEqualToY<Spec.GetValue<T3, "key">, string>(true));
    });

    test("Specification Circular Reference", () => {
        type T1 = Spec<{ref: T1; refs: T1[]}>;

        assert.ok(isXEqualToY<T1, T1>(true));
    });

    test("Source Comparsion", () => {
        type D1 = {value: number; private: boolean};
        type T1 = SpecOf<D1, {value: number; public: string}>;

        assert.ok(isXEqualToY<Spec.GetSpec<T1, "value">, {value: number; public: string}>(true));
        assert.ok(isXEqualToY<Spec.GetSource<T1, "value">, D1>(true));
    });

    test("Mutator<TSource, TReturns>", () => {
        type D1 = {value: number};
        type T0 = SpecOf<D1, {value: number}>;
        type T1 = SpecOf<D1, {value: Mutator<number, string>}>;

        // @ts-expect-error
        type T2 = SpecOf<D1, {value: string}>;

        // @ts-expect-error
        type T3 = SpecOf<D1, {value: Mutator<boolean, string>}>;

        assert.ok(isXEqualToY<Spec.GetType<T0, "value">, number>(true));
        assert.ok(isXEqualToY<Spec.GetType<T1, "value">, Mutator<number, string>>(true));
        assert.ok(isXEqualToY<Spec.GetType<T2, "value">, string>(true));
        assert.ok(isXEqualToY<Spec.GetType<T3, "value">, Mutator<boolean, string>>(true));
        assert.ok(isXEqualToY<Spec.GetType<T3, "value">, Mutator<boolean, string>>(true));
    });

    test("Input<TInput, TSource, never>", () => {
        type D1 = {value: number};
        type D2 = {$gt: number; $lt: number};
        type T1 = SpecOf<D1, {value: Input<Spec<D2>, number>}>;

        assert.ok(isXEqualToY<Spec.GetType<T1, "value">, Input<Spec<D2>, number>>(true));

        type D3 = {value: number};
        type T2 = SpecOf<D3, {value: Input<Spec<D2>, number, string>}>;

        assert.ok(isXEqualToY<Spec.GetType<T2, "value">, Input<Spec<D2>, number, string>>(true));
    });

    test("Arrays", () => {
        type D1 = {array: string[]};
        type S1 = SpecOf<D1, {array: string[]}>;
        type S2 = Spec<{array: string[]}>;

        assert.ok(isXEqualToY<Spec.GetType<S1, "array">, string[]>(true));
        assert.ok(isXEqualToY<Spec.GetValue<S1, "array">, string[]>(true));
        assert.ok(isXEqualToY<Spec.GetType<S2, "array">, string[]>(true));
    });

    test("Intersection", () => {
        type D1 = {d2: D2; self: D1};
        type D2 = {d1: D1; self: D2};
        type S1 = SpecOf<D1, {d2: S2; self: S1}>;
        type S2 = SpecOf<D2, {d1: S1; self: S2}>;

        assert.ok(isXEqualToY<Spec.GetType<S1, "self">, S1>(true));
        assert.ok(isXEqualToY<Spec.GetValue<S1, "d2">, D2>(true));
        assert.ok(isXEqualToY<Spec.GetType<S1, "d2">, S2>(true));
        assert.ok(isXEqualToY<Spec.GetValue<S1, "d2">, D2>(true));
    });
});
