import {describe, expect, mock, test} from "bun:test";

import {RuntimeClosedException, RuntimeController} from "../../controller/index.mjs";
import {run} from "../../run.mjs";
import {runtime} from "../../runtime.mjs";

describe("runtime", () => {
    test("should run work in a borrowed controller without closing it", async () => {
        const borrowed = RuntimeController.clone("borrowed");
        const cleanup = mock(() => void 0);
        borrowed.defer(cleanup);

        try {
            const nested = await borrowed.run(() => run(() => runtime.use()));

            expect(nested).toBe(borrowed);
            expect(borrowed.signal.aborted).toBeFalse();
            expect(cleanup).not.toHaveBeenCalled();
        } finally {
            await borrowed.close();
        }

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("should refuse to own the current controller", async () => {
        const current = RuntimeController.clone("current");
        const task = mock(async () => void 0);

        try {
            await current.run(() =>
                expect(runtime.run(task, current)).rejects.toThrow("cannot own the current controller"),
            );

            expect(current.signal.aborted).toBeFalse();
            expect(task).not.toHaveBeenCalled();
        } finally {
            await current.close();
        }
    });

    test("should refuse a closing controller once its cleanup finishes, without calling the task", async () => {
        const closing = RuntimeController.clone("closing");
        const task = mock(async () => void 0);
        closing.close();

        await expect(runtime.run(task, closing)).rejects.toBeInstanceOf(RuntimeClosedException);
        expect(task).not.toHaveBeenCalled();
    });
});
