import {log} from "@typesec/tracer";
import {AsyncLock} from "../lib/index.mjs";
import {runtime} from "./runtime.mts";

export function heartbeat(ctrl: AbortController = runtime.controller): Promise<void> {
    log("heartbeat(%s)", ctrl.constructor.name);

    return AsyncLock.acquire(
        ctrl.signal,
        (release) =>
            new Promise(function beat(resolve) {
                log("beat(): %s", ctrl.signal.aborted ? "break" : "start");
                if (ctrl.signal.aborted) {
                    return resolve();
                }

                if (runtime.controller !== ctrl) {
                    runtime.enqueue(ctrl);
                }

                ctrl.signal.addEventListener(
                    "abort",
                    () => {
                        log("beat(): stop");
                        resolve();
                        release();
                    },
                    {once: true},
                );
            }),
    );
}
