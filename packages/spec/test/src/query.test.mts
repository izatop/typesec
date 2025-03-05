import {isXEqualToY, type Fn} from "@typesec/the";
import assert from "node:assert";
import test, {describe} from "node:test";
import type {Query} from "../../src/query.mjs";
import type {Spec} from "../../src/spec.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("Query", () => {
    test("The Read and Mutator resolvers", () => {
        type T1 = Spec<{
            name: string;
            array: number[];
            optional?: boolean;
            nullable: Date | null;
        }>;

        // @ts-expect-error
        type R1 = Query.Resolve<T1, {name: Fn<[boolean], string>}>; // wrong resolver
        assert.ok(isXEqualToY<R1, {name: never}>(true));

        // @ts-expect-error
        type R1_0 = Query.Resolve<T1, {name: 123}>; // wrong read flag
        assert.ok(isXEqualToY<R1_0, {name: never}>(true));

        type R1_1 = Query.Resolve<T1, {name: 1}>; // base resolver with Read = 1 flag
        assert.ok(isXEqualToY<R1_1, {name: string}>(true));

        type R1_2 = Query.Resolve<T1, {name: true}>; // base resolver with Read = true flag
        assert.ok(isXEqualToY<R1_2, {name: string}>(true));

        type R2 = Query.Resolve<T1, {array: [true]}>; // resolve as is
        assert.ok(isXEqualToY<R2, {array: number[]}>(true));

        type R2_1 = Query.Resolve<T1, {array: [() => Date]}>; // mutate each item
        assert.ok(isXEqualToY<R2_1, {array: Date[]}>(true));

        type R2_2 = Query.Resolve<T1, {array: (v: number[]) => string}>; // mutate whole array
        assert.ok(isXEqualToY<R2_2, {array: string}>(true));

        type R3 = Query.Resolve<T1, {optional: true}>;
        assert.ok(isXEqualToY<R3, {optional: boolean | undefined}>(true));

        type R4 = Query.Resolve<T1, {nullable: true}>;
        assert.ok(isXEqualToY<R4, {nullable: Date | null}>(true));
    });

    test("The Asterisk and Array of Object resolvers", () => {
        type T1 = Spec<{
            name: string;
        }>;

        type T2 = Spec<{
            level: number;
            parent: T2 | null;
            names?: T1[];
        }>;

        type R1 = Query.Resolve<T2, {parent: "*"; names: [{name: true}]}>;
        type TRes = {
            parent: {level: number; parent: never; names: never} | null;
            names: Array<{name: string}> | undefined;
        };

        assert.ok(isXEqualToY<R1, TRes>(true));
    });
});
