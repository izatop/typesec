import {assert} from "@typesec/the/assert";
import {identify} from "@typesec/the/object";
import {get} from "radash";
import {toAsyncDisposable} from "../lib/dispostable.mjs";
import {AsyncLock} from "../lib/index.mjs";
import {tracer} from "../tracer.mjs";
import {lifecycle} from "./controller/index.mjs";
import {dispose} from "./dispose.mjs";
import {exit} from "./exit.mjs";
import type {MainTask} from "./interfaces.mjs";

/**
 * Runs an entrypoint as the lifecycle's work and shuts the process down after it.
 *
 * Disposes whatever the task returns, closes the lifecycle awaiting its cleanup, then exits `0` on success and `1` on
 * a thrown error, tracing either way. This is the outermost call of a TypeSec process, so a second call is refused.
 * @category runtime
 * @example main(fn.arrow("cli", () => runApplication(path)))
 */
export async function main(task: MainTask): Promise<Timer> {
    lifecycle.signal.throwIfAborted();
    assert(!AsyncLock.has(lifecycle), "main(): already called");

    return AsyncLock.acquire(lifecycle, async () => {
        const name = get(task, "meta.name") ?? identify(task);

        try {
            tracer.info("await %s()", name);
            await using _closing = toAsyncDisposable(lifecycle.close);
            await dispose(await lifecycle.run(task));
        } catch (reason) {
            tracer.error(reason);

            return exit(1, reason);
        }

        return exit(0);
    });
}
