import {dateUtils} from "@typesec/the/date";
import {is} from "@typesec/the/fn";
import {numbers} from "@typesec/the/numbers";
import {proto} from "./proto.mts";

const string = proto.primitive({
    id: "string",
    is: (value) => is(value, "string"),
});

const boolean = proto.primitive({
    id: "boolean",
    is: (value) => is(value, "boolean"),
});

const float = proto.primitive({
    id: "float",
    is: (value) => numbers.isFinite(value),
});

const int = proto.primitive({
    id: "int",
    is: (value) => numbers.isInt(value),
});

const ISODate = proto.codec({
    id: "ISODate",
    is: (value) => dateUtils.valid(value),
    encode: (value) => value.toISOString(),
    decode: (value) => new Date(value),
});

const bigint = proto.codec({
    id: "bigint",
    is: (value) => is(value, "bigint"),
    encode: (value) => value.toString(),
    decode: (value) => BigInt(value),
});

export const scalars = {
    ISODate,
    boolean,
    string,
    bigint,
    float,
    int,
};
