import {describe, expect, mock, spyOn, test} from "bun:test";
import {lifecycle} from "../../controller/index.mjs";
import {main} from "../../main.mjs";

describe("main", () => {
    test("should run the entrypoint, dispose its result and close the lifecycle before exiting", async () => {
        const order: string[] = [];
        const closeSpy = spyOn(lifecycle, "close").mockImplementation(async () => {
            await new Promise((resolve) => setImmediate(resolve));
            order.push("closed");
        });

        try {
            const task = mock(async function task() {
                return {[Symbol.dispose]: () => void order.push("result disposed")};
            });

            const timer = await main(task);
            clearImmediate(timer);

            expect(task.mock.calls).toEqual([[]]);
            expect(order).toEqual(["result disposed", "closed"]);
        } finally {
            closeSpy.mockRestore();
        }
    });

    test("should refuse a second call while the entrypoint runs", async () => {
        const closeSpy = spyOn(lifecycle, "close").mockImplementation(async () => void 0);
        const gate = Promise.withResolvers<void>();
        const task = mock(async () => void 0);

        try {
            const running = main(() => gate.promise);

            await expect(main(task)).rejects.toThrow("already called");
            expect(task).not.toHaveBeenCalled();

            gate.resolve();
            clearImmediate(await running);
        } finally {
            closeSpy.mockRestore();
        }
    });
});
