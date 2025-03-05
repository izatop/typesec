import assert from "node:assert/strict";
import test, {describe, mock} from "node:test";
import {AsyncLock} from "../../src/index.mjs";

describe("AsyncLock", () => {
    test("acquire", async () => {
        const [t1, f1] = [{n: 1}, mock.fn(() => Promise.resolve({t: Math.random()}))];
        assert.strictEqual(AsyncLock.acquire(t1, f1), AsyncLock.acquire(t1, f1));
        assert.equal(f1.mock.callCount(), 1);
    });

    test("release", async () => {
        const [t1, f1] = [{n: 1}, mock.fn(() => Promise.resolve({t: Math.random()}))];

        await AsyncLock.acquire(t1, f1);
        assert.ok(AsyncLock.has(t1) === false);

        assert.notStrictEqual(await AsyncLock.acquire(t1, f1), await AsyncLock.acquire(t1, f1));
        assert.equal(f1.mock.callCount(), 3);
    });
});
