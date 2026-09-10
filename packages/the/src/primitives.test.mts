import {describe, expect, test} from "bun:test";
import {primitives} from "./primitives.mjs";

describe("primitives", () => {
    test("exports representative primitive and callable values", () => {
        expect(primitives.Object).toEqual({});
        expect(primitives.Array).toEqual([]);
        expect(primitives.Float).toBe(1.1);
        expect(primitives.Number).toBe(1);
        expect(primitives.BigInt).toBe(1n);
        expect(primitives.True).toBeTrue();
        expect(primitives.False).toBeFalse();
        expect(primitives.String).toBe("Hello, tests!");
        expect(primitives.Closure()).toBeUndefined();
        expect(primitives.Function.name).toBe("named");
        expect(primitives.Function()).toBeUndefined();
    });

    test("keeps the misspelled key pointing at the same value", () => {
        expect(primitives.Objec).toBe(primitives.Object);
    });
});
