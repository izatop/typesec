import {AssertionException} from "@typesec/the/errors";
import {describe, expect, mock, test} from "bun:test";
import {toAsyncDisposable, toDisposable} from "../../../../lib/dispostable.mjs";
import {RuntimeController} from "../../index.mjs";

const tick = () => new Promise((done) => setImmediate(done));

describe("RuntimeController release", () => {
    test("should dispose an owned resource once ahead of closure and share the attempt with close()", async () => {
        const controller = RuntimeController.clone();
        const cleanup = mock(() => void 0);
        const resource = toDisposable(cleanup);
        const order: string[] = [];

        controller.own(resource);
        controller.defer(() => {
            order.push("deferred");
        });

        const released = controller.release(resource);
        const repeated = controller.release(resource);

        expect(cleanup).not.toHaveBeenCalled();

        await released;

        expect(repeated).toBe(released);
        expect(cleanup).toHaveBeenCalledTimes(1);

        await controller.close();
        await controller.release(resource);

        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(order).toEqual(["deferred"]);
    });

    test("should let close() wait for a release in flight", async () => {
        const controller = RuntimeController.clone();
        const gate = Promise.withResolvers<void>();
        const resource = toAsyncDisposable(() => gate.promise);
        const closed = mock(() => void 0);

        controller.own(resource);

        const released = controller.release(resource);
        const closing = controller.close().then(closed);
        await tick();

        expect(closed).not.toHaveBeenCalled();

        gate.resolve();
        await released;
        await closing;

        expect(closed).toHaveBeenCalledTimes(1);
    });

    test("should refuse a resource the controller does not own", () => {
        const controller = RuntimeController.clone();
        const foreign = toDisposable(() => void 0);

        expect(() => controller.release(foreign)).toThrow(AssertionException);
    });

    test("should return the in-flight attempt once close() has started disposing the resource", async () => {
        const controller = RuntimeController.clone();
        const gate = Promise.withResolvers<void>();
        const started = Promise.withResolvers<void>();
        const cleanup = mock(async () => {
            started.resolve();

            await gate.promise;
        });
        const resource = toAsyncDisposable(cleanup);
        const settled = mock(() => void 0);

        controller.own(resource);

        const closing = controller.close();
        await started.promise;

        const released = controller.release(resource);
        void released.then(settled);
        await tick();

        expect(settled).not.toHaveBeenCalled();

        gate.resolve();
        await released;
        await closing;

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("should refuse to own a resource another controller already owns and leave cleanup with the owner", async () => {
        const owner = RuntimeController.clone();
        const other = RuntimeController.clone();
        const cleanup = mock(() => void 0);
        const resource = toDisposable(cleanup);

        owner.own(resource);

        expect(() => other.own(resource)).toThrow(AssertionException);

        await other.close();

        expect(cleanup).not.toHaveBeenCalled();

        await owner.close();

        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
