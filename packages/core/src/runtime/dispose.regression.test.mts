import {describe, expect, mock, test} from "bun:test";
import {dispose} from "./dispose.mjs";

describe("dispose regressions", () => {
    test("should prefer and await async disposal when both hooks exist", async () => {
        const {promise: gate, resolve: release} = Promise.withResolvers<void>();
        let receiver: unknown;
        const disposable = {
            [Symbol.asyncDispose]: mock(async function (this: unknown) {
                receiver = this;
                await gate;
            }),
            [Symbol.dispose]: mock(() => void 0),
        };
        let settled = false;

        const pending = dispose(disposable).then(() => {
            settled = true;
        });

        try {
            await Promise.resolve();

            expect(settled).toBeFalse();
            expect(receiver).toBe(disposable);
            expect(disposable[Symbol.asyncDispose]).toHaveBeenCalledTimes(1);
            expect(disposable[Symbol.dispose]).not.toHaveBeenCalled();
        } finally {
            release();
        }

        await pending;

        expect(settled).toBeTrue();
        expect(disposable[Symbol.asyncDispose]).toHaveBeenCalledTimes(1);
        expect(disposable[Symbol.dispose]).not.toHaveBeenCalled();
    });

    test("should propagate async disposal rejection without calling the sync hook", async () => {
        const reason = new Error("Async disposal failed");
        const disposable = {
            [Symbol.asyncDispose]: mock(async () => {
                throw reason;
            }),
            [Symbol.dispose]: mock(() => void 0),
        };

        const pending = dispose(disposable);

        await expect(pending).rejects.toBe(reason);
        expect(disposable[Symbol.asyncDispose]).toHaveBeenCalledTimes(1);
        expect(disposable[Symbol.dispose]).not.toHaveBeenCalled();
    });

    test("should propagate a sync disposal throw as a rejected promise", async () => {
        const reason = new Error("Sync disposal failed");
        const disposable = {
            [Symbol.dispose]: mock(() => {
                throw reason;
            }),
        };

        const pending = dispose(disposable);

        await expect(pending).rejects.toBe(reason);
        expect(disposable[Symbol.dispose]).toHaveBeenCalledTimes(1);
    });
});
