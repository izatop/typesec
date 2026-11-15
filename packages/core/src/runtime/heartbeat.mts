import {AsyncLock} from "../lib/index.mjs";
import {tracer} from "../tracer.mts";
import {store} from "./controller/hmr.mjs";
import {RuntimeController} from "./controller/RuntimeController.mjs";

// The same lookup as `runtime.use()`; importing `runtime` would start the root while the controller class initializes.
const current = (): RuntimeController => store.context.getStore() ?? RuntimeController.lifecycle;

/**
 * Keeps the process alive until the controller aborts.
 *
 * A server calls it after binding, so the runtime stays up until a signal or an explicit abort arrives.
 * @category runtime
 */
export function heartbeat(ctrl: AbortController = current()): Promise<void> {
    tracer.log("heartbeat(%s)", ctrl.constructor.name);

    return AsyncLock.acquire(
        ctrl.signal,
        (release) =>
            new Promise(function beat(resolve) {
                tracer.log("beat(): %s", ctrl.signal.aborted ? "break" : "start");
                if (ctrl.signal.aborted) {
                    return resolve();
                }

                const controller = current();
                if (controller !== ctrl) {
                    controller.enqueue(ctrl);
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
