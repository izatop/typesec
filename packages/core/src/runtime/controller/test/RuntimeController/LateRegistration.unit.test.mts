import {describe, expect, mock, test} from "bun:test";

import {ApplicationException} from "@typesec/the/errors";

import {toAsyncDisposable, toDisposable} from "../../../../lib/dispostable.mjs";
import {RuntimeClosedException, RuntimeController} from "../../index.mjs";

describe("RuntimeController late registration", () => {
    test("a late resource should reject registration and join the active cleanup batch", async () => {
        const controller = RuntimeController.clone();
        const {promise: originalGate, resolve: releaseOriginal} = Promise.withResolvers<void>();
        const {promise: originalStarted, resolve: markOriginalStarted} = Promise.withResolvers<void>();
        const {promise: lateGate, resolve: releaseLate} = Promise.withResolvers<void>();
        const {promise: lateStarted, resolve: markLateStarted} = Promise.withResolvers<void>();
        const lateCleanup = mock(async () => {
            markLateStarted();

            await lateGate;
        });
        const lateResource = toAsyncDisposable(lateCleanup);
        let failure: unknown;
        let settled = false;

        controller.defer(async () => {
            markOriginalStarted();

            await originalGate;
        });

        const pending = controller.close();
        const observed = pending.then(() => {
            settled = true;
        });

        try {
            await originalStarted;

            try {
                controller.own(lateResource);
            } catch (reason) {
                failure = reason;
            }

            expect(failure).toBeInstanceOf(RuntimeClosedException);
            expect(failure).toBeInstanceOf(ApplicationException);
            expect((failure as RuntimeClosedException).controller).toBe(controller);

            const joined = (failure as RuntimeClosedException).controller.close();

            expect(joined).toBe(pending);
            expect(lateCleanup).not.toHaveBeenCalled();

            releaseOriginal();
            await lateStarted;
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(settled).toBeFalse();
            expect(lateCleanup).toHaveBeenCalledTimes(1);
        } finally {
            releaseOriginal();
            releaseLate();
            await observed;
        }

        expect(settled).toBeTrue();
        expect(controller.close()).toBe(pending);
    });

    test("a deferred callback registered during abort should join the initial LIFO drain", async () => {
        const controller = RuntimeController.clone();
        const order: string[] = [];
        const lateCleanup = mock(() => {
            order.push("late");
        });
        let failure: unknown;

        controller.defer(() => {
            order.push("older");
        });
        controller.signal.addEventListener(
            "abort",
            () => {
                try {
                    controller.defer(lateCleanup);
                } catch (reason) {
                    failure = reason;
                }
            },
            {once: true},
        );

        const pending = controller.close();
        await pending;

        expect(failure).toBeInstanceOf(RuntimeClosedException);
        expect(order).toEqual(["late", "older"]);
        expect(lateCleanup).toHaveBeenCalledTimes(1);
    });

    test("known queued resources should not be reordered or retried by late registration", async () => {
        const controller = RuntimeController.clone();
        const order: string[] = [];
        const firstCleanup = mock(() => {
            order.push("first");
        });
        const first = toDisposable(firstCleanup);
        const failures: unknown[] = [];

        controller.own(first);
        controller.defer(() => {
            order.push("middle");
        });
        controller.defer(() => {
            order.push("last");

            try {
                controller.own(first);
            } catch (reason) {
                failures.push(reason);
            }

            try {
                controller.defer(() => {
                    order.push("late");
                });
            } catch (reason) {
                failures.push(reason);
            }
        });

        const pending = controller.close();
        await pending;

        expect(failures).toHaveLength(2);
        expect(failures[0]).toBeInstanceOf(RuntimeClosedException);
        expect(failures[1]).toBeInstanceOf(RuntimeClosedException);
        expect(order).toEqual(["last", "late", "middle", "first"]);
        expect(firstCleanup).toHaveBeenCalledTimes(1);

        expect(() => controller.own(first)).toThrow(RuntimeClosedException);

        const repeated = controller.close();

        expect(repeated).toBe(pending);
        expect(firstCleanup).toHaveBeenCalledTimes(1);
    });

    test("late cleanup failures should join the active batch without losing undefined reasons", async () => {
        const controller = RuntimeController.clone();
        const originalReason = new Error("Original cleanup failed");
        const {promise: gate, resolve: release} = Promise.withResolvers<void>();
        const {promise: started, resolve: markStarted} = Promise.withResolvers<void>();
        let failure: unknown;

        controller.defer(async () => {
            markStarted();

            await gate;

            throw originalReason;
        });

        const pending = controller.close();
        const observed = pending.then(
            () => undefined,
            () => undefined,
        );

        try {
            await started;

            expect(() =>
                controller.defer(() => {
                    throw undefined;
                }),
            ).toThrow(RuntimeClosedException);
        } finally {
            release();
            await observed;
        }

        try {
            await pending;
        } catch (reason) {
            failure = reason;
        }

        expect(failure).toBeInstanceOf(AggregateError);
        expect((failure as AggregateError).errors).toHaveLength(2);
        expect((failure as AggregateError).errors[0]).toBe(originalReason);
        expect((failure as AggregateError).errors[1]).toBeUndefined();
    });

    test("registration after the final drain should start a new batch before the first promise settles", async () => {
        const controller = RuntimeController.clone();
        const cleanup = mock(() => void 0);
        const resource = toDisposable(cleanup);
        const {promise: registered, resolve: markRegistered} = Promise.withResolvers<void>();
        let failure: unknown;
        let current: Promise<void> | undefined;

        const initial = controller.close();
        queueMicrotask(() => {
            try {
                controller.own(resource);
            } catch (reason) {
                failure = reason;
            }

            current = controller.close();
            markRegistered();
        });

        try {
            await registered;

            expect(failure).toBeInstanceOf(RuntimeClosedException);
            expect((failure as RuntimeClosedException).controller).toBe(controller);
            expect(current).not.toBe(initial);
            expect(current).toBe(controller.close());

            await current;
            await initial;

            expect(cleanup).toHaveBeenCalledTimes(1);
        } finally {
            await controller.close();
        }
    });

    test("new post-close registrations should share a fresh cleanup batch without reopening the scope", async () => {
        const controller = RuntimeController.clone();
        const {promise: gate, resolve: release} = Promise.withResolvers<void>();
        const {promise: started, resolve: markStarted} = Promise.withResolvers<void>();
        const cleanup = mock(() => {
            markStarted();

            return gate;
        });
        const resourceCleanup = mock(() => void 0);
        const resource = toDisposable(resourceCleanup);
        let failure: unknown;

        const original = controller.close();
        await original;

        try {
            try {
                controller.defer(cleanup);
            } catch (reason) {
                failure = reason;
            }

            expect(failure).toBeInstanceOf(RuntimeClosedException);

            const pending = (failure as RuntimeClosedException).controller.close();

            expect(pending).not.toBe(original);
            expect(controller.close()).toBe(pending);
            expect(controller.signal.aborted).toBeTrue();

            await started;

            expect(() => controller.own(resource)).toThrow(RuntimeClosedException);
            expect(controller.close()).toBe(pending);
            expect(resourceCleanup).not.toHaveBeenCalled();
        } finally {
            release();
            await controller.close();
        }

        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(resourceCleanup).toHaveBeenCalledTimes(1);
    });

    test("later cleanup batches should retain their own errors without replaying earlier failures", async () => {
        const controller = RuntimeController.clone();
        const originalReason = new Error("First batch failed");
        const laterReason = new Error("Later async batch failed");
        const finalCleanup = mock(() => void 0);

        controller.defer(() => {
            throw originalReason;
        });

        const original = controller.close();

        await expect(original).rejects.toBe(originalReason);

        expect(() =>
            controller.own(
                toDisposable(() => {
                    throw undefined;
                }),
            ),
        ).toThrow(RuntimeClosedException);

        const second = controller.close();

        expect(second).not.toBe(original);
        await expect(second).rejects.toBeUndefined();
        expect(controller.close()).toBe(second);

        expect(() =>
            controller.defer(async () => {
                throw laterReason;
            }),
        ).toThrow(RuntimeClosedException);

        const third = controller.close();

        expect(third).not.toBe(second);
        await expect(third).rejects.toBe(laterReason);

        expect(() => controller.own(toDisposable(finalCleanup))).toThrow(RuntimeClosedException);

        const final = controller.close();

        expect(final).not.toBe(third);
        await expect(final).resolves.toBeUndefined();
        expect(finalCleanup).toHaveBeenCalledTimes(1);
        expect(controller.close()).toBe(final);
        await expect(original).rejects.toBe(originalReason);
    });
});
