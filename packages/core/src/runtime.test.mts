import {describe, expect, mock, test} from "bun:test";
import {nextTick} from "node:process";
import {sleep} from "radash";
import {runtime, watch} from "./index.mjs";
import {heartbeat} from "./runtime/heartbeat.mjs";

describe("Runtime", () => {
    test("watch", async () => {
        const disposer = mock(async () => void 0);

        const main = mock(async () => {
            return {[Symbol.asyncDispose]: disposer};
        });

        clearImmediate(await watch(main));

        expect(disposer.mock.calls.length).toBe(1);
        expect(main.mock.calls.length).toBe(1);
    });

    test("heartbeat", async () => {
        const immediate = watch(async () => {
            const c = new AbortController();

            nextTick(() => c.abort());
            while (!c.signal.aborted) {
                await sleep(1);
            }

            return heartbeat(c);
        });

        expect(immediate).resolves.not.toBeEmpty();
        clearImmediate(await immediate);
    });

    test("controller", async () => {
        expect(runtime.signal.aborted).toBeFalse();

        runtime.trap();
        expect(process.listenerCount("SIGINT")).toBe(1);
        expect(process.listenerCount("SIGTERM")).toBe(1);

        process.emit("SIGINT");
        expect(process.listenerCount("SIGINT")).toBe(0);
        expect(runtime.signal.aborted).toBeTrue();
        expect(heartbeat()).resolves.toBeEmpty();
    });
});
