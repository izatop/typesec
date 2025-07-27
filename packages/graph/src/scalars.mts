import {complex, primitive} from "./proto.mts";

export const string = primitive({
    name: "string",
    validate: (value): value is string => typeof value === "string",
});

export const boolean = primitive({
    name: "bool",
    validate: (value): value is boolean => typeof value === "boolean",
});

export const float = primitive({
    name: "float",
    validate: (value): value is number => typeof value === "number",
});

export const int = primitive({
    name: "int",
    validate: (value): value is number => typeof value === "number" && value % 1 === 0,
});

export const bigint = complex({
    name: "bigint",
    format: string(),
    validate: (value): value is bigint => typeof value === "bigint",
    deserialize: (value) => BigInt(value),
    serialize: (value) => value.toString(),
});

export const datetime = complex({
    name: "datetime",
    format: string(),
    validate: (value): value is Date => value instanceof Date && value.toString() !== "Invalid Date",
    deserialize: (value) => new Date(value),
    serialize: (value) => value.toISOString(),
});

export const scalars = {
    string,
    boolean,
    float,
    int,
    bigint,
    datetime,
};
