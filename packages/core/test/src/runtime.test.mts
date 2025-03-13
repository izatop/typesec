import {describe, mock, test} from "bun:test";
import * as assert from "node:assert/strict";
import {nextTick} from "node:process";
import {sleep} from "radash";
import {runtime, watch} from "../../src/index.mjs";
import {heartbeat} from "../../src/runtime/heartbeat.mjs";

describe("Runtime", () => {
    test("watch", async () => {
        const disposer = mock(async () => void 0);

        const main = mock(async () => {
            return {[Symbol.asyncDispose]: disposer};
        });

        clearImmediate(await watch(main));

        assert.strictEqual(disposer.mock.calls.length, 1);
        assert.strictEqual(main.mock.calls.length, 1);
    });

    test("heartbeat", async () => {
        const immediate = await watch(async () => {
            const c = new AbortController();

            nextTick(() => c.abort());
            while (!c.signal.aborted) {
                await sleep(1);
            }

            return heartbeat(c);
        });

        clearImmediate(immediate);
    });

    test("controller", async () => {
        assert.strictEqual(runtime.signal.aborted, false);

        runtime.trap();
        assert.strictEqual(process.listenerCount("SIGINT"), 1);
        assert.strictEqual(process.listenerCount("SIGTERM"), 1);

        process.emit("SIGINT");
        assert.strictEqual(process.listenerCount("SIGINT"), 0);
        assert.strictEqual(runtime.signal.aborted, true);

        assert.strictEqual(await heartbeat(), undefined);
    });
});
