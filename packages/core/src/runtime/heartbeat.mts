import {AsyncLock} from "../lib/index.mjs";
import {tracer} from "../tracer.mts";
import {runtime} from "./runtime.mjs";

/**
 * Keeps the process alive until the controller aborts.
 *
 * A server calls it after binding, so the runtime stays up until a signal or an explicit abort arrives.
 * @category runtime
 */
export function heartbeat(ctrl: AbortController = runtime.controller): Promise<void> {
    tracer.log("heartbeat(%s)", ctrl.constructor.name);

    return AsyncLock.acquire(
        ctrl.signal,
        (release) =>
            new Promise(function beat(resolve) {
                tracer.log("beat(): %s", ctrl.signal.aborted ? "break" : "start");
                if (ctrl.signal.aborted) {
                    return resolve();
                }

                if (runtime.controller !== ctrl) {
                    runtime.enqueue(ctrl);
                }

                ctrl.signal.addEventListener(
                    "abort",
                    () => {
                        tracer.log("beat(): stop");
                        resolve();
                        release();
                    },
                    {once: true},
                );
            }),
    );
}
