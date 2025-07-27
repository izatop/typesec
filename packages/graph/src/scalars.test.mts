import type {Rec} from "@typesec/the";
import {describe, expect, test} from "bun:test";
import {scalars} from "./scalars.mts";

describe("scalars", async () => {
    test("scalars should work", () => {
        const samples: Rec<keyof typeof scalars, unknown> = {
            bigint: 1n,
            boolean: true,
            float: 1.1,
            int: 1,
            string: "",
            datetime: new Date(0),
        };

        const any = Object.values(samples);

        expect(
            Object.values(scalars)
                .map((scalar) => scalar())
                .map((type) => [type.name, any.map((value) => [value, type.validate(value)])]),
        ).toMatchSnapshot();
    });

    test("datetime should work", () => {
        const value = new Date(0);
        const type = scalars.datetime();
        expect(type.validate(value)).toBeTrue();
        expect(type.serialize(value)).toBe(value.toISOString());
        expect(type.deserialize(value.toISOString())).toEqual(value);
    });

    test("bigint should work", () => {
        const value = 1n;
        const type = scalars.bigint();
        expect(type.validate(value)).toBeTrue();
        expect(type.serialize(value)).toBe(value.toString());
        expect(type.deserialize(value.toString())).toBe(value);
    });
});
