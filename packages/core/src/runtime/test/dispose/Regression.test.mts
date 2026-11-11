import {describe, expect, mock, test} from "bun:test";
import {toAsyncDisposable, toDisposable} from "../../../lib/dispostable.mjs";
import {dispose} from "../../dispose.mjs";

describe("dispose regressions", () => {
    test("should prefer and await async disposal when both hooks exist", async () => {
        const {promise: gate, resolve: release} = Promise.withResolvers<void>();
        let receiver: unknown;
        const asyncCleanup = mock(async function (this: unknown) {
            receiver = this;
            await gate;
        });
        const syncCleanup = mock(() => void 0);
        const disposable = {
            ...toAsyncDisposable(asyncCleanup),
            ...toDisposable(syncCleanup),
        };
        let settled = false;

        const pending = dispose(disposable).then(() => {
            settled = true;
        });

        try {
            await Promise.resolve();

            expect(settled).toBeFalse();
            expect(receiver).toBe(disposable);
            expect(asyncCleanup).toHaveBeenCalledTimes(1);
            expect(syncCleanup).not.toHaveBeenCalled();
        } finally {
            release();
        }

        await pending;

        expect(settled).toBeTrue();
        expect(asyncCleanup).toHaveBeenCalledTimes(1);
        expect(syncCleanup).not.toHaveBeenCalled();
    });

    test("should propagate async disposal rejection without calling the sync hook", async () => {
        const reason = new Error("Async disposal failed");
        const asyncCleanup = mock(async () => {
            throw reason;
        });
        const syncCleanup = mock(() => void 0);
        const disposable = {
            ...toAsyncDisposable(asyncCleanup),
            ...toDisposable(syncCleanup),
        };

        const pending = dispose(disposable);

        await expect(pending).rejects.toBe(reason);
        expect(asyncCleanup).toHaveBeenCalledTimes(1);
        expect(syncCleanup).not.toHaveBeenCalled();
    });

    test("should propagate a sync disposal throw as a rejected promise", async () => {
        const reason = new Error("Sync disposal failed");
        const cleanup = mock(() => {
            throw reason;
        });
        const disposable = toDisposable(cleanup);

        const pending = dispose(disposable);

        await expect(pending).rejects.toBe(reason);
        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
