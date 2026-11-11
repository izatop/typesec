import {describe, expect, mock, spyOn, test} from "bun:test";
import {ExitSignals} from "../../../../const.mjs";
import {toAsyncDisposable, toDisposable} from "../../../../lib/dispostable.mjs";
import {RuntimeController} from "../../index.mjs";

describe("RuntimeController resource ownership", () => {
    test("should own resources by identity and dispose mixed registrations once in LIFO order", async () => {
        const controller = RuntimeController.clone();
        const order: string[] = [];
        const firstCleanup = mock(() => {
            order.push("first");
        });
        const lastCleanup = mock(async () => {
            order.push("last");
        });
        const first = toDisposable(firstCleanup);
        const last = toAsyncDisposable(lastCleanup);

        try {
            const owned = controller.own(first);
            controller.defer(() => {
                order.push("deferred");
            });
            controller.own(last);
            controller.own(first);

            expect(owned).toBe(first);
            expect(order).toEqual([]);

            const pending = controller.close();
            await pending;

            const repeated = controller.close();
            const aborted = controller.abort();
            const disposed = controller[Symbol.dispose]();

            expect(repeated).toBe(pending);
            expect(aborted).toBe(controller);
            expect(disposed).toBeUndefined();
            expect(controller.signal.aborted).toBeTrue();
            expect(order).toEqual(["last", "deferred", "first"]);
            expect(firstCleanup).toHaveBeenCalledTimes(1);
            expect(lastCleanup).toHaveBeenCalledTimes(1);
        } finally {
            await controller.close();
        }
    });

    test("should share the close promise and await each LIFO cleanup before starting the next", async () => {
        const controller = RuntimeController.clone();
        const {promise: gate, resolve: release} = Promise.withResolvers<void>();
        const {promise: started, resolve: markStarted} = Promise.withResolvers<void>();
        const order: string[] = [];
        const olderCleanup = mock(() => {
            order.push("older");
        });
        const older = toDisposable(olderCleanup);
        const rejectedResource = toDisposable(mock(() => void 0));
        const rejectedCleanup = mock(() => void 0);
        let settled = false;

        controller.own(older);
        controller.defer(async () => {
            order.push("newer:start");
            markStarted();

            await gate;

            order.push("newer:end");
        });

        const pending = controller.close();
        const concurrent = controller.close();
        const observed = pending.then(() => {
            settled = true;
        });

        try {
            await started;

            expect(concurrent).toBe(pending);
            expect(controller.signal.aborted).toBeTrue();
            expect(settled).toBeFalse();
            expect(order).toEqual(["newer:start"]);
            expect(olderCleanup).not.toHaveBeenCalled();
            expect(() => controller.own(rejectedResource)).toThrow();
            expect(() => controller.defer(rejectedCleanup)).toThrow();
        } finally {
            release();
            await observed;
        }

        const repeated = controller.close();

        expect(repeated).toBe(pending);
        expect(settled).toBeTrue();
        expect(order).toEqual(["newer:start", "newer:end", "older"]);
        expect(olderCleanup).toHaveBeenCalledTimes(1);
        expect(() => controller.own(rejectedResource)).toThrow();
        expect(() => controller.defer(rejectedCleanup)).toThrow();

        await controller.close();
    });

    test("should retain a single cleanup error and finish older registrations", async () => {
        const controller = RuntimeController.clone();
        const reason = new Error("Deferred cleanup failed");
        const olderCleanup = mock(() => void 0);
        const older = toDisposable(olderCleanup);
        const failing = mock(() => {
            throw reason;
        });

        controller.own(older);
        controller.defer(failing);

        const pending = controller.close();

        await expect(pending).rejects.toBe(reason);

        const repeated = controller.close();
        controller.abort();
        controller[Symbol.dispose]();

        expect(repeated).toBe(pending);
        await expect(repeated).rejects.toBe(reason);
        expect(failing).toHaveBeenCalledTimes(1);
        expect(olderCleanup).toHaveBeenCalledTimes(1);
    });

    test("synchronous disposal should observe failures without losing the rejected close promise", async () => {
        const controller = RuntimeController.clone();
        const reason = new Error("Cleanup started by synchronous disposal failed");
        const cleanup = mock(() => {
            throw reason;
        });

        controller.defer(cleanup);

        const result = controller[Symbol.dispose]();

        try {
            await new Promise<void>((resolve) => setImmediate(resolve));

            const pending = controller.close();

            expect(result).toBeUndefined();
            await expect(pending).rejects.toBe(reason);
            expect(cleanup).toHaveBeenCalledTimes(1);
        } finally {
            await controller.close().catch(() => undefined);
        }
    });

    test("should preserve every sync and async cleanup error, including undefined", async () => {
        const controller = RuntimeController.clone();
        const syncReason = new Error("Sync cleanup failed");
        const asyncReason = new Error("Async cleanup failed");
        const order: string[] = [];
        let failure: unknown;

        controller.own(
            toDisposable(() => {
                order.push("undefined");
                throw undefined;
            }),
        );
        controller.defer(async () => {
            order.push("async");
            throw asyncReason;
        });
        controller.own(
            toDisposable(() => {
                order.push("sync");
                throw syncReason;
            }),
        );

        const pending = controller.close();

        try {
            await pending;
        } catch (reason) {
            failure = reason;
        }

        expect(failure).toBeInstanceOf(AggregateError);
        expect((failure as AggregateError).errors).toHaveLength(3);
        expect((failure as AggregateError).errors[0]).toBe(syncReason);
        expect((failure as AggregateError).errors[1]).toBe(asyncReason);
        expect((failure as AggregateError).errors[2]).toBeUndefined();
        expect(order).toEqual(["sync", "async", "undefined"]);

        const repeated = controller.close();

        expect(repeated).toBe(pending);
        await expect(repeated).rejects.toBe(failure);
    });

    test("should finish abort dispatch before releasing traps during reentrant close calls", async () => {
        const controller = RuntimeController.clone();
        const reason = new Error("Close with reentrant callbacks");
        const cleanup = mock(() => void 0);
        const initialListeners = ExitSignals.map((signal) => process.listenerCount(signal));
        const originalClearInterval = globalThis.clearInterval;
        const intervals = spyOn(globalThis, "setInterval");
        const clearedIntervals = spyOn(globalThis, "clearInterval");
        let reentrant: Promise<void> | undefined;
        let disposed: unknown;
        let aborted: RuntimeController | undefined;

        controller.defer(cleanup);

        try {
            controller.trap();
            controller.signal.addEventListener(
                "abort",
                () => {
                    reentrant = controller.close();
                    disposed = controller[Symbol.dispose]();
                    aborted = controller.abort();
                },
                {once: true},
            );
            using child = controller.clone();

            const pending = controller.close(reason);

            expect(reentrant).toBe(pending);
            expect(disposed).toBeUndefined();
            expect(aborted).toBe(controller);
            expect(controller.signal.reason).toBe(reason);
            expect(child.signal.aborted).toBeTrue();
            expect(intervals).toHaveBeenCalledTimes(1);
            expect(clearedIntervals).toHaveBeenCalledTimes(1);
            expect(clearedIntervals).toHaveBeenCalledWith(intervals.mock.results[0]!.value);
            expect(ExitSignals.map((signal) => process.listenerCount(signal))).toEqual(initialListeners);

            await pending;

            expect(cleanup).toHaveBeenCalledTimes(1);
            expect(clearedIntervals).toHaveBeenCalledTimes(1);
        } finally {
            try {
                await controller.close();
            } finally {
                for (const result of intervals.mock.results) {
                    if (result.type === "return") originalClearInterval(result.value);
                }

                intervals.mockRestore();
                clearedIntervals.mockRestore();
            }
        }
    });

    test("should preserve a synchronous trap cleanup failure and still dispose owned resources", async () => {
        const controller = RuntimeController.clone();
        const reason = new Error("Signal trap cleanup failed");
        const cleanup = mock(() => void 0);
        const resource = toDisposable(cleanup);
        const originalRemoveListener = process.removeListener;

        controller.own(resource);
        controller.trap();

        const removals = spyOn(process, "removeListener").mockImplementation(
            (
                event: Parameters<typeof process.removeListener>[0],
                listener: Parameters<typeof process.removeListener>[1],
            ) => {
                const result = originalRemoveListener.call(process, event, listener);

                if (event === "SIGTERM" && listener === controller.abort) throw reason;

                return result;
            },
        );

        try {
            const pending = controller.close();

            await expect(pending).rejects.toBe(reason);
            expect(cleanup).toHaveBeenCalledTimes(1);
        } finally {
            removals.mockRestore();

            await controller.close().catch(() => undefined);

            for (const signal of ExitSignals) originalRemoveListener.call(process, signal, controller.abort);
        }
    });

    for (const initiation of ["abort", "dispose"] as const) {
        test(`${initiation} should synchronously initiate the same asynchronous close`, async () => {
            const controller = RuntimeController.clone();
            const reason = new Error("Abort starts resource cleanup");
            const {promise: gate, resolve: release} = Promise.withResolvers<void>();
            const {promise: started, resolve: markStarted} = Promise.withResolvers<void>();
            const cleanup = mock(() => {
                markStarted();

                return gate;
            });

            controller.defer(cleanup);

            const result = initiation === "abort" ? controller.abort(reason) : controller[Symbol.dispose]();
            const pending = controller.close();

            try {
                expect(result).toBe(initiation === "abort" ? controller : undefined);
                expect(controller.signal.aborted).toBeTrue();
                if (initiation === "abort") expect(controller.signal.reason).toBe(reason);

                await started;

                const concurrent = controller.close();

                expect(cleanup).toHaveBeenCalledTimes(1);
                expect(concurrent).toBe(pending);
            } finally {
                release();
                await pending;
            }

            const repeated = controller.close();

            expect(repeated).toBe(pending);
            expect(cleanup).toHaveBeenCalledTimes(1);
        });
    }
});
