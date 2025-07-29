import {describe, expect, mock, test} from "bun:test";
import {xmap} from "../index.mjs";

describe("XMap", () => {
    test("xmap(Map)", () => {
        const map = xmap(new Map<string, number>());
        expect(Reflect.has(map, "ensure")).toBeTrue();

        const key = "key";
        const factory = mock(() => Math.random());
        expect(map.ensure(key, factory)).toBe(map.ensure(key, factory));
        expect(factory.mock.calls.length).toBe(1);
    });

    test("xmap(WeakMap)", () => {
        const map = xmap(new WeakMap<WeakKey>());
        expect(Reflect.has(map, "ensure")).toBeTrue();

        const key = {};
        const factory = mock(() => Math.random());
        expect(map.ensure(key, factory)).toBe(map.ensure(key, factory));
        expect(factory.mock.calls.length).toBe(1);
    });
});
