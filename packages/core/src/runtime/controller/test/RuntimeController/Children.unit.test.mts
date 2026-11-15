import {describe, expect, mock, test} from "bun:test";
import {toDisposable} from "../../../../lib/dispostable.mjs";
import {RuntimeController} from "../../index.mjs";
import {RuntimeClosedException} from "../../RuntimeClosedException.mjs";

describe("RuntimeController descendant cleanup", () => {
    test("should await detached child work and grandchild cleanup before releasing parent resources", async () => {
        const parent = RuntimeController.clone();
        const child = parent.clone();
        const grandchild = child.clone();
        const workGate = Promise.withResolvers<void>();
        const cleanupGate = Promise.withResolvers<void>();
        const cleanupStarted = Promise.withResolvers<void>();
        const order: string[] = [];
        let registrationError: unknown;

        parent.defer(() => {
            order.push("pool");
        });

        child.defer(() => {
            order.push("transaction");
        });

        grandchild.defer(async () => {
            order.push("grandchild:start");
            cleanupStarted.resolve();

            await cleanupGate.promise;

            order.push("grandchild:end");
        });

        const work = child.track(async () => {
            order.push("work:start");

            await workGate.promise;

            order.push("work:end");

            try {
                child.own(
                    toDisposable(() => {
                        order.push("late-resource");
                    }),
                );
            } catch (error) {
                registrationError = error;
            }
        });

        const childClosing = child.close();
        parent.detach(child);

        const closing = parent.close();

        try {
            await cleanupStarted.promise;
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(parent.has(child)).toBeFalse();
            expect(child.has(grandchild)).toBeFalse();
            expect(child.signal.aborted).toBeTrue();
            expect(grandchild.signal.aborted).toBeTrue();
            expect(order).toEqual(["work:start", "grandchild:start"]);

            workGate.resolve();
            await work;
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(registrationError).toBeInstanceOf(RuntimeClosedException);
            expect((registrationError as RuntimeClosedException).controller).toBe(child);
            expect(order).toEqual(["work:start", "grandchild:start", "work:end"]);
        } finally {
            workGate.resolve();
            cleanupGate.resolve();

            await Promise.all([work, childClosing, closing]);
        }

        expect(order).toEqual([
            "work:start",
            "grandchild:start",
            "work:end",
            "grandchild:end",
            "late-resource",
            "transaction",
            "pool",
        ]);
    });

    test("should start sibling cleanup in parallel and preserve failures while finishing the parent", async () => {
        const parent = RuntimeController.clone();
        const first = parent.clone();
        const second = parent.clone();
        const firstStarted = Promise.withResolvers<void>();
        const secondStarted = Promise.withResolvers<void>();
        const firstGate = Promise.withResolvers<void>();
        const secondGate = Promise.withResolvers<void>();
        const reason = new Error("Second child cleanup failed");
        const parentCleanup = mock(() => void 0);

        parent.defer(parentCleanup);
        first.defer(async () => {
            firstStarted.resolve();

            await firstGate.promise;

            throw undefined;
        });

        second.defer(async () => {
            secondStarted.resolve();

            await secondGate.promise;

            throw reason;
        });

        const closing = parent.close();

        try {
            // Both children start while the other is still held, so neither waits for its sibling.
            await Promise.all([firstStarted.promise, secondStarted.promise]);
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(first.signal.aborted).toBeTrue();
            expect(second.signal.aborted).toBeTrue();
            expect(parentCleanup).not.toHaveBeenCalled();
        } finally {
            firstGate.resolve();
            secondGate.resolve();

            await closing.catch(() => undefined);
        }

        const failure = await closing.catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(AggregateError);
        expect((failure as AggregateError).errors).toHaveLength(2);
        expect((failure as AggregateError).errors[0]).toBeUndefined();
        expect((failure as AggregateError).errors[1]).toBe(reason);
        expect(parentCleanup).toHaveBeenCalledTimes(1);
    });

    test("should not replay an already observed child failure in a later parent close", async () => {
        const parent = RuntimeController.clone();
        const child = parent.clone();
        const reason = new Error("Earlier child cleanup failed");
        const parentCleanup = mock(() => void 0);

        parent.defer(parentCleanup);
        child.defer(() => {
            throw reason;
        });

        const childClosing = child.close();

        await expect(childClosing).rejects.toBe(reason);
        await new Promise<void>((resolve) => setImmediate(resolve));

        await parent.close();

        expect(parentCleanup).toHaveBeenCalledTimes(1);
        await expect(childClosing).rejects.toBe(reason);
    });

    test("should join new child cleanup after the parent has closed without replaying earlier errors", async () => {
        const parent = RuntimeController.clone();
        const child = parent.clone();
        const gate = Promise.withResolvers<void>();
        const started = Promise.withResolvers<void>();
        const reason = new Error("Late child cleanup failed");
        const cleanup = mock(async () => {
            started.resolve();

            await gate.promise;

            throw reason;
        });

        const nextCleanup = mock(() => void 0);
        let settled = false;

        const initial = parent.close();
        await initial;

        expect(() => child.defer(cleanup)).toThrow(RuntimeClosedException);

        const late = parent.close();
        const observed = late.then(
            () => {
                settled = true;
            },
            () => {
                settled = true;
            },
        );

        try {
            await started.promise;
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(late).not.toBe(initial);
            expect(parent.close()).toBe(late);
            expect(settled).toBeFalse();
            expect(parent.signal.aborted).toBeTrue();
        } finally {
            gate.resolve();

            await observed;
        }

        await expect(late).rejects.toBe(reason);
        await initial;

        expect(() => child.defer(nextCleanup)).toThrow(RuntimeClosedException);

        const next = parent.close();
        await next;

        expect(next).not.toBe(late);
        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(nextCleanup).toHaveBeenCalledTimes(1);
        await expect(late).rejects.toBe(reason);
    });

    test("should recheck child drains before starting the next parent disposer", async () => {
        const parent = RuntimeController.clone();
        const child = parent.clone();
        const parentGate = Promise.withResolvers<void>();
        const parentStarted = Promise.withResolvers<void>();
        const childGate = Promise.withResolvers<void>();
        const childStarted = Promise.withResolvers<void>();
        const order: string[] = [];

        parent.defer(() => {
            order.push("pool");
        });

        parent.defer(async () => {
            order.push("parent:start");
            parentStarted.resolve();

            await parentGate.promise;

            order.push("parent:end");
        });

        const closing = parent.close();

        try {
            await parentStarted.promise;

            expect(() =>
                child.defer(async () => {
                    order.push("child:start");
                    childStarted.resolve();

                    await childGate.promise;

                    order.push("child:end");
                }),
            ).toThrow(RuntimeClosedException);

            await childStarted.promise;

            parentGate.resolve();
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(order).toEqual(["parent:start", "child:start", "parent:end"]);
        } finally {
            parentGate.resolve();
            childGate.resolve();

            await closing;
        }

        expect(order).toEqual(["parent:start", "child:start", "parent:end", "child:end", "pool"]);
    });

    test("should keep enqueue as an abort link while the clone owner awaits cleanup", async () => {
        const owner = RuntimeController.clone();
        const linked = RuntimeController.clone();
        const child = owner.clone();
        const gate = Promise.withResolvers<void>();
        const started = Promise.withResolvers<void>();
        const ownerCleanup = mock(() => void 0);
        const linkedCleanup = mock(() => void 0);

        owner.defer(ownerCleanup);
        linked.defer(linkedCleanup);
        child.defer(() => {
            started.resolve();

            return gate.promise;
        });

        linked.enqueue(child);

        const linkedClosing = linked.close();

        try {
            await started.promise;
            await linkedClosing;

            expect(child.signal.aborted).toBeTrue();
            expect(linkedCleanup).toHaveBeenCalledTimes(1);

            owner.close();
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(ownerCleanup).not.toHaveBeenCalled();
        } finally {
            gate.resolve();

            await Promise.all([owner.close(), linkedClosing]);
        }

        expect(ownerCleanup).toHaveBeenCalledTimes(1);
    });

    test("should retain a child created and immediately aborted during parent abort dispatch", async () => {
        const parent = RuntimeController.clone();
        const gate = Promise.withResolvers<void>();
        const started = Promise.withResolvers<void>();
        const parentCleanup = mock(() => void 0);
        let registrationError: unknown;

        parent.defer(parentCleanup);
        parent.signal.addEventListener(
            "abort",
            () => {
                const child = parent.clone();

                try {
                    child.defer(() => {
                        started.resolve();

                        return gate.promise;
                    });
                } catch (error) {
                    registrationError = error;
                }
            },
            {once: true},
        );

        const closing = parent.close();

        try {
            await started.promise;
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(registrationError).toBeInstanceOf(RuntimeClosedException);
            expect(parentCleanup).not.toHaveBeenCalled();
        } finally {
            gate.resolve();

            await closing;
        }

        expect(parentCleanup).toHaveBeenCalledTimes(1);
    });
});
