import {array} from "@typesec/the/array";
import type {Arrayify, KeyOf} from "@typesec/the/type";
import {describe, expect, it} from "bun:test";
import type {Proto} from "./proto.mts";
import {scalars} from "./scalars.mts";

type ScalarsType = typeof scalars;

type ScalarsTestTable = {
    [K in KeyOf<ScalarsType>]: {
        proto: ScalarsType[K];
        value: Arrayify<Proto.Infer<ScalarsType[K]>>;
        fails?: unknown[];
    };
};

const table: ScalarsTestTable = {
    bigint: {
        proto: scalars.bigint,
        value: 1n,
        fails: [1, "s"],
    },
    boolean: {
        proto: scalars.boolean,
        value: [true, false],
        fails: [0, 1, "Y"],
    },
    float: {
        proto: scalars.float,
        value: [1, 1.1, Number.MAX_VALUE],
        fails: [Infinity, -Infinity, NaN],
    },
    int: {
        proto: scalars.int,
        value: [...Array.from({length: 3}).map((_, index) => index), Number.MAX_SAFE_INTEGER],
        fails: [-1.1, 1.1, Infinity, -Infinity, NaN],
    },
    ISODate: {
        proto: scalars.ISODate,
        value: new Date(0),
        fails: [new Date("invalid")],
    },
    string: {
        proto: scalars.string,
        value: ["", "test"],
        fails: [{}, {toString: () => ""}],
    },
};

describe.each(Object.values(table).flatMap((item) => array.arraify(item.value).map((value) => ({...item, value}))))(
    "scalars should pass",
    ({proto, value}) => {
        it(`${proto.id}.is(${value})`, () => {
            expect(proto.is(value)).toBeTrue();
        });
    },
);

describe.each(
    Object.values(table).flatMap((item) => array.arraify(item.fails ?? []).map((value) => ({...item, value}))),
)("scalars should fail", ({proto, value}) => {
    it(`${proto.id}.is(${value})`, () => {
        expect(proto.is(value)).toBeFalse();
    });
});
