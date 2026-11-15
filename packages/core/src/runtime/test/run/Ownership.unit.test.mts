import {describe, expect, mock, test} from "bun:test";
import {RuntimeClosedException, RuntimeController} from "../../controller/index.mjs";
import {run} from "../../run.mjs";
import {runtime} from "../../runtime.mjs";

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("run() ownership", () => {
    test("should close the controller once after a successful body and await its cleanup", async () => {
        const owned = RuntimeController.clone("owned");
        const gate = Promise.withResolvers<void>();
        const cleanup = mock(() => gate.promise);
        let settled = false;
        owned.defer(cleanup);

        const running = run(async () => runtime.use(), owned).then((value) => {
            settled = true;

            return value;
        });

        await tick();

        expect(owned.signal.aborted).toBeTrue();
        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(settled).toBeFalse();

        gate.resolve();

        expect(await running).toBe(owned);

        await owned.close();

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("should close the controller after a sync throw and an async rejection", async () => {
        const reason = new Error("body");
        const tasks = [
            () => {
                throw reason;
            },
            async () => {
                throw reason;
            },
        ];

        for (const task of tasks) {
            const owned = RuntimeController.clone("owned");
            const cleanup = mock(() => void 0);
            owned.defer(cleanup);

            await expect(run(task, owned)).rejects.toBe(reason);

            expect(owned.signal.aborted).toBeTrue();
            expect(cleanup).toHaveBeenCalledTimes(1);
        }
    });

    test("should reject with the cleanup failure of a successful body", async () => {
        const owned = RuntimeController.clone("owned");
        const failure = new Error("cleanup");
        owned.defer(() => {
            throw failure;
        });

        await expect(run(async () => void 0, owned)).rejects.toBe(failure);
    });

    test("should report both failures with the task error suppressed", async () => {
        const owned = RuntimeController.clone("owned");
        const reason = new Error("body");
        const failure = new Error("cleanup");
        owned.defer(() => {
            throw failure;
        });

        const error = await run(async () => {
            throw reason;
        }, owned).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SuppressedError);
        expect((error as SuppressedError).error).toBe(failure);
        expect((error as SuppressedError).suppressed).toBe(reason);
    });

    test("should refuse a closing controller after its cleanup finishes", async () => {
        const owned = RuntimeController.clone("owned");
        const gate = Promise.withResolvers<void>();
        const task = mock(async () => void 0);
        let settled = false;
        owned.defer(() => gate.promise);

        owned.close();
        const rejection = run(task, owned).catch((reason: unknown) => {
            settled = true;

            return reason;
        });

        await tick();

        expect(settled).toBeFalse();

        gate.resolve();
        const reason = await rejection;

        expect(reason).toBeInstanceOf(RuntimeClosedException);
        expect((reason as RuntimeClosedException).controller).toBe(owned);
        expect(task).not.toHaveBeenCalled();
    });

    test("should not deadlock when the body aborts its own controller", async () => {
        const owned = RuntimeController.clone("owned");
        const cleanup = mock(() => void 0);
        owned.defer(cleanup);

        const result = await run(async () => {
            owned.abort("self");

            return "stopped";
        }, owned);

        expect(result).toBe("stopped");
        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
