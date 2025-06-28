import {describe, expect, mock, test} from "bun:test";
import assert from "node:assert/strict";
import {AsyncLock} from "../../src/index.mjs";

describe("AsyncLock", () => {
    test("acquire", async () => {
        const [t1, f1] = [{n: 1}, mock(() => Promise.resolve({t: Math.random()}))];
        expect(AsyncLock.acquire(t1, f1)).toBe(AsyncLock.acquire(t1, f1));
        expect(f1.mock.calls.length).toBe(1);
    });

    test("release", async () => {
        const [t1, f1] = [{n: 1}, mock(() => Promise.resolve({t: Math.random()}))];

        await AsyncLock.acquire(t1, f1);
        assert.ok(AsyncLock.has(t1) === false);

        assert.notStrictEqual(await AsyncLock.acquire(t1, f1), await AsyncLock.acquire(t1, f1));
        assert.equal(f1.mock.calls.length, 3);
    });
});
