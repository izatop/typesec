import {log} from "@typesec/tracer";
import {AsyncLock} from "../lib/index.mjs";
import {runtime} from "./runtime.mjs";

export function heartbeat(ctrl: AbortController = runtime): Promise<void> {
    const {signal} = ctrl;
    log("acquire(): {exists: %s}", AsyncLock.has(signal));

    return AsyncLock.acquire(
        signal,
        (release) =>
            new Promise(function beat(resolve) {
                log("beat(): %s", signal.aborted ? "break" : "start");
                if (signal.aborted) {
                    return resolve();
                }

                if (runtime !== ctrl) {
                    runtime.enqueue(ctrl);
                }

                signal.addEventListener(
                    "abort",
                    () => {
                        log("beat(): stop");
                        resolve(void 0);
                        release();
                    },
                    {once: true},
                );
            }),
    );
}
