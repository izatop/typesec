import * as assert from "node:assert/strict";
import {nextTick} from "node:process";
import test, {describe, mock} from "node:test";
import {sleep} from "radash";
import {Unit, runtime, watch} from "../../src/index.mjs";
import {heartbeat} from "../../src/runtime/heartbeat.mjs";
import avg from "./action/avg.mjs";

describe("Runtime", () => {
    test("watch", async () => {
        const disposer = mock.fn(async () => void 0);

        const main = mock.fn(async () => {
            return {[Symbol.asyncDispose]: disposer};
        });

        clearImmediate(await watch(main));

        assert.strictEqual(disposer.mock.callCount(), 1);
        assert.strictEqual(main.mock.callCount(), 1);
    });

    test("heartbeat", async () => {
        const immediate = await watch(async () => {
            const c = new AbortController();
            const unit = new Unit({});

            nextTick(() => c.abort());
            while (!c.signal.aborted) {
                assert.strictEqual(await unit.run(avg, {values: [2, 10, 3]}), 5);
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
