import {isXEqualToY, type Arrayify, type Nullable} from "@typesec/the";
import assert from "node:assert";
import test, {describe} from "node:test";
import type {ANT, ComplexType, ID, NANT, Primitive, Resolver, SimpleType, TypeList} from "../../src/spec.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("Type", () => {
    test("Primitive", () => {
        assert.ok(isXEqualToY<Primitive, string | boolean | number | bigint>(true));
    });

    test("SimpleType", () => {
        assert.ok(isXEqualToY<SimpleType, Primitive | ID | Date>(true));
    });

    test("ComplexType", () => {
        assert.ok(isXEqualToY<ComplexType, {[key: string]: ANT<TypeList>}>(true));
    });

    test("TypeList", () => {
        assert.ok(isXEqualToY<TypeList, SimpleType | ComplexType | Resolver.Any>(true));
    });

    test("ANT/NANT", () => {
        assert.ok(isXEqualToY<ANT<string | number>, Arrayify<Nullable<string | number>>>(true));
        type foo = NANT<ANT<string | number>>;
        assert.ok(isXEqualToY<NANT<ANT<string | number>>, string | number>(true));
    });
});
