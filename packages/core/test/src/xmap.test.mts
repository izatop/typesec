import assert from "node:assert/strict";
import test, {describe, mock} from "node:test";
import {ensure, xmap} from "../../src/lib/fn.mjs";

describe("XMap", () => {
    test("ensure", () => {
        const map = new Map();

        const key = {};
        const factory = mock.fn(() => Math.random());
        assert.strictEqual(ensure(map, key, factory), ensure(map, key, factory));
        assert.strictEqual(factory.mock.callCount(), 1);
    });

    test("Map", () => {
        const map = xmap(new Map<string, number>());
        assert.ok(Reflect.has(map, "ensure"));

        const key = "key";
        const factory = mock.fn(() => Math.random());
        assert.strictEqual(map.ensure(key, factory), map.ensure(key, factory));
        assert.strictEqual(factory.mock.callCount(), 1);
    });

    test("WeakMap", () => {
        const map = xmap(new WeakMap());
        assert.ok(Reflect.has(map, "ensure"));

        const key = {};
        const factory = mock.fn(() => Math.random());
        assert.strictEqual(map.ensure(key, factory), map.ensure(key, factory));
        assert.strictEqual(factory.mock.callCount(), 1);
    });
});
