import {assert} from "@typesec/the/assert";
import {identify} from "@typesec/the/object";
import {get} from "radash";

import {isAsyncDisposable, isDisposable, toAsyncDisposable} from "../lib/dispostable.mjs";
import {AsyncLock} from "../lib/index.mjs";
import {registration} from "../service/registration.mjs";
import {tracer} from "../tracer.mjs";
import {store} from "./controller/hmr.mjs";
import {lifecycle} from "./controller/index.mjs";
import {dispose} from "./dispose.mjs";
import {exit} from "./exit.mjs";
import type {MainReturns, MainTask} from "./interfaces.mjs";

/** Releases the task's result; one the lifecycle owns goes through `lifecycle.release`, so it is disposed once. */
function release(result: MainReturns): Promise<void> {
    const owned = (isDisposable(result) || isAsyncDisposable(result)) && lifecycle.settled(result) !== undefined;

    return owned ? lifecycle.release(result) : dispose(result);
}

/**
 * Runs an entrypoint as the lifecycle's work and shuts the process down after it.
 *
 * Waits first for every eager service build of the generation (`lazy: false`): a failure ends the process
 * with `1` without calling the task, and a signal or reload that closes the lifecycle meanwhile ends the entrypoint
 * without calling the task, exiting `0` after a signal and resolving `undefined` after a reload. Disposes whatever the
 * task returns as part of the task's work, so the lifecycle's own resources outlive it, closes the lifecycle awaiting
 * its cleanup, then exits `0` on success and `1` on a thrown error, tracing either way. A generation replaced by a hot
 * reload finishes without exiting on success, leaving the process to the new one, and resolves `undefined`. This is the
 * outermost call of a TypeSec process, so a second call is refused. The result's disposer is part of the task, so it
 * must not await the lifecycle's `close()`; a result owned by another controller is disposed here and again by that
 * controller.
 * @category runtime
 * @example main(fn.arrow("cli", () => runApplication(path)))
 */
export async function main(task: MainTask): Promise<Timer | undefined> {
    lifecycle.signal.throwIfAborted();
    assert(!AsyncLock.has(lifecycle), "main(): already called");

    return AsyncLock.acquire(lifecycle, async () => {
        const name = get(task, "meta.name") ?? identify(task);

        try {
            tracer.info("await %s()", name);
            await using _closing = toAsyncDisposable(lifecycle.close);

            // A signal or reload that closes the lifecycle during the warmup ends the entrypoint without its task; the
            // builds it interrupted are not the entrypoint's failure.
            await registration.warmup?.().catch((reason: unknown) => {
                if (lifecycle.isRunning()) throw reason;
            });

            if (lifecycle.isRunning()) await lifecycle.run(async () => release(await task()));
        } catch (reason) {
            tracer.error(reason);

            return exit(1, reason);
        }

        // A reload has already published a newer lifecycle, which now owns the process.
        if (store.lifecycle !== lifecycle) {
            tracer.info("%s(): replaced by a reload", name);

            return undefined;
        }

        return exit(0);
    });
}
