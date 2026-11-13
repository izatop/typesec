import {describe, expect, mock, test} from "bun:test";
import {lifecycle, RuntimeClosedException, RuntimeController} from "./controller/index.mjs";
import {run} from "./run.mjs";
import {runtime} from "./runtime.mjs";

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("run()", () => {
    test("should run a task", async () => {
        const task = mock(async () => ({name: "test"}));

        const res = await run(task);

        expect(res.name).toBe("test");
        expect(task).toHaveBeenCalledTimes(1);
    });

    test("should borrow the lifecycle at top level and leave it open", async () => {
        const seen = await run(() => runtime.use());

        expect(seen).toBe(lifecycle);
        expect(lifecycle.signal.aborted).toBeFalse();
    });

    test("should track the body on the borrowed controller", async () => {
        const borrowed = RuntimeController.clone("borrowed");
        const cleanup = mock(() => void 0);
        const gate = Promise.withResolvers<void>();
        borrowed.defer(cleanup);

        const running = borrowed.run(() => run(() => gate.promise));
        const closing = borrowed.close();
        await tick();

        expect(cleanup).not.toHaveBeenCalled();

        gate.resolve();
        await running;
        await closing;

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("should reject with the body error and leave the borrowed controller open", async () => {
        const borrowed = RuntimeController.clone("borrowed");
        const reason = new Error("body");
        const tasks = [
            () => {
                throw reason;
            },
            async () => {
                throw reason;
            },
        ];

        try {
            for (const task of tasks) {
                await expect(borrowed.run(() => run(task))).rejects.toBe(reason);
            }

            expect(borrowed.signal.aborted).toBeFalse();
        } finally {
            await borrowed.close();
        }
    });

    test("should refuse a closing borrowed controller without calling the task", async () => {
        const borrowed = RuntimeController.clone("borrowed");
        const task = mock(async () => void 0);

        await borrowed.run(async () => {
            borrowed.close();

            await expect(run(task)).rejects.toBeInstanceOf(RuntimeClosedException);
        });

        await borrowed.close();

        expect(task).not.toHaveBeenCalled();
    });
});
