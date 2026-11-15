import type {Rec} from "@typesec/the";
import {tracer} from "../tracer.mjs";
import {store} from "./controller/hmr.mjs";

const reasons: Rec = {0: "Graceful exit", 1: "Unknown error"};

/**
 * Schedules process shutdown on the next tick, tracing the code and reason.
 *
 * A successful exit scheduled by a running generation is dropped when a hot reload publishes a new one before it fires,
 * leaving the process to that generation; any other code still ends it.
 * @category runtime
 */
export function exit(code: number = 0, reason: unknown = null): Timer {
    const log = code > 0 ? tracer.error : tracer.info;

    try {
        const lifecycle = store.lifecycle;

        return setImmediate(() => {
            if (code !== 0 || lifecycle === undefined || store.lifecycle === lifecycle) {
                process.exit(code);
            } else {
                tracer.info("exit(0): replaced by a reload");
            }
        }) as unknown as Timer;
    } finally {
        log("exit(%d): %o", code, reason ? `${reason}` : reasons[code]);
    }
}
