import {describe, expect, mock, test} from "bun:test";
import {AsyncLock} from "./index.mjs";

describe("AsyncLock", () => {
    test("acquire", async () => {
        const [t1, f1] = [{n: 1}, mock(() => Promise.resolve({t: Math.random()}))];
        expect(AsyncLock.acquire(t1, f1)).toBe(AsyncLock.acquire(t1, f1));
        expect(f1.mock.calls.length).toBe(1);
    });

    test("release", async () => {
        const [t1, f1] = [{n: 1}, mock(() => Promise.resolve({t: Math.random()}))];

        await AsyncLock.acquire(t1, f1);
        expect(AsyncLock.has(t1)).toBeFalse();

        expect(await AsyncLock.acquire(t1, f1)).not.toStrictEqual(await AsyncLock.acquire(t1, f1));
        expect(f1.mock.calls.length).toBe(3);
    });
});
