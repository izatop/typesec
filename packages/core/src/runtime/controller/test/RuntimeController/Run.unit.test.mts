import {describe, expect, mock, test} from "bun:test";

import {runtime} from "../../../runtime.mjs";
import {RuntimeController} from "../../index.mjs";

describe("RuntimeController run()", () => {
    test("should run several tasks in its context and stay open", async () => {
        const owner = RuntimeController.clone("owner");
        const cleanup = mock(() => void 0);
        owner.defer(cleanup);

        try {
            const first = await owner.run(() => runtime.use());
            const second = await owner.run(async () => runtime.use());

            expect(first).toBe(owner);
            expect(second).toBe(owner);
            expect(owner.signal.aborted).toBeFalse();
            expect(cleanup).not.toHaveBeenCalled();
        } finally {
            await owner.close();
        }

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("should keep closure waiting for a running task", async () => {
        const owner = RuntimeController.clone("owner");
        const cleanup = mock(() => void 0);
        const gate = Promise.withResolvers<void>();
        owner.defer(cleanup);

        const running = owner.run(() => gate.promise);
        const closing = owner.close();
        await new Promise((resolve) => setImmediate(resolve));

        expect(cleanup).not.toHaveBeenCalled();

        gate.resolve();
        await running;
        await closing;

        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
