import {array} from "@typesec/the/array";
import {fn} from "@typesec/the/fn";
import type {Arrayify, KeyOf} from "@typesec/the/type";
import {describe, expect, it} from "bun:test";
import type {Proto} from "./proto.mts";
import {scalars} from "./scalars.mts";

type ScalarsType = typeof scalars;

type ScalarsTestTable = {
    [K in KeyOf<ScalarsType>]: {
        proto: Proto.Any;
        isKind?: Arrayify<Proto.Infer<ScalarsType[K]>>;
        isValid: Arrayify<Proto.Infer<ScalarsType[K]>>;
        faildKind?: unknown[];
        faildValid: unknown[];
    };
};

const table: ScalarsTestTable = {
    bigint: {
        proto: scalars.bigint,
        isValid: 1n,
        faildValid: [1, "s"],
    },
    boolean: {
        proto: scalars.boolean,
        isValid: [true, false],
        faildValid: [0, 1, "Y"],
    },
    float: {
        proto: scalars.float,
        isValid: [1, 1.1, Number.MAX_VALUE, -Number.MAX_VALUE],
        faildValid: [Infinity, -Infinity, NaN],
    },
    int: {
        proto: scalars.int,
        isValid: [...Array.from({length: 3}).map((_, index) => index), Number.MAX_SAFE_INTEGER],
        faildValid: [-1.1, 1.1, Infinity, -Infinity, NaN],
    },
    ISODate: {
        proto: scalars.ISODate,
        isKind: [new Date(0), new Date("invalid")],
        isValid: new Date(0),
        faildKind: [{}],
        faildValid: [new Date("invalid")],
    },
    string: {
        proto: scalars.string,
        isValid: ["", "test"],
        faildValid: [{}, {toString: () => ""}],
    },
};

describe.each(
    Object.values(table).flatMap((item) =>
        array.arraify(item.isKind || item.isValid).map((value) => ({...item, value})),
    ),
)("should pass", ({proto, value}) => {
    it(`${proto.id}.isKind(${fn.toStringValue(value)})`, () => {
        expect(proto.isKind(value)).toBeTrue();
    });
});

describe.each(
    Object.values(table).flatMap((item) =>
        array.arraify(item.faildKind ?? item.faildValid ?? []).map((value) => ({...item, value})),
    ),
)("should fail", ({proto, value}) => {
    it(`${proto.id}.isKind(${fn.toStringValue(value)})`, () => {
        expect(proto.isKind(value)).toBeFalse();
    });
});

describe.each(Object.values(table).flatMap((item) => array.arraify(item.isValid).map((value) => ({...item, value}))))(
    "should pass",
    ({proto, value}) => {
        it(`${proto.id}.isValid(${fn.toStringValue(value)})`, () => {
            expect(proto.isValid(value)).toBeTrue();
        });
    },
);

describe.each(
    Object.values(table).flatMap((item) => array.arraify(item.faildValid ?? []).map((value) => ({...item, value}))),
)("should fail", ({proto, value}) => {
    it(`${proto.id}.isValid(${fn.toStringValue(value)})`, () => {
        expect(proto.isValid(value)).toBeFalse();
    });
});
