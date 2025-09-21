import {date} from "@typesec/the/date";
import {is} from "@typesec/the/fn";
import {numbers} from "@typesec/the/numbers";
import {codec, primitive, proto} from "./proto.mts";

const string = primitive({
    id: "string",
    kind: "string",
    isValid: (value): value is string => is(value, "string"),
});

const boolean = primitive({
    id: "boolean",
    kind: "boolean",
    isValid: (value): value is boolean => is(value, "boolean"),
});

const float = proto.primitive({
    id: "float",
    kind: "number",
    isValid: numbers.isFinite,
});

const int = proto.primitive({
    id: "int",
    kind: "number",
    isValid: numbers.isInt,
});

const bigint = codec({
    id: "bigint",
    isKind: (value): value is bigint => is(value, "bigint"),
    isValid: (value): value is bigint => is(value, "bigint"),
    encode: (value) => value.toString(),
    decode: (value) => BigInt(value),
});

const ISODate = proto.codec({
    id: "ISODate",
    isKind: date.is,
    isValid: date.valid,
    encode: (value) => value.toISOString(),
    decode: (value) => new Date(value),
});

export const scalars = {
    ISODate,
    boolean,
    string,
    bigint,
    float,
    int,
};
