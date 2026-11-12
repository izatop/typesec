import {describe, expect, mock, test} from "bun:test";
import {RuntimeController} from "./controller/index.mjs";
import {run} from "./run.mjs";
import {runtime} from "./runtime.mjs";

describe("runtime", () => {
    test("should run work in a borrowed controller without closing it", async () => {
        const borrowed = RuntimeController.clone("borrowed");
        const cleanup = mock(() => void 0);
        borrowed.defer(cleanup);

        try {
            const nested = await runtime.run(() => run(() => runtime.use()), borrowed);

            expect(nested).toBe(borrowed);
            expect(borrowed.signal.aborted).toBeFalse();
            expect(cleanup).not.toHaveBeenCalled();
        } finally {
            await borrowed.close();
        }

        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
