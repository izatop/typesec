import type {Rec} from "@typesec/the";
import {tracer} from "../tracer.mjs";

const reasons: Rec = {0: "Graceful exit", 1: "Unknown error"};

/**
 * Schedules process shutdown on the next tick, tracing the code and reason.
 * @category runtime
 */
export function exit(code: number = 0, reason: unknown = null): Timer {
    const log = code > 0 ? tracer.error : tracer.info;

    try {
        return setImmediate(() => process.exit(code)) as unknown as Timer;
    } finally {
        log("exit(%d): %o", code, reason ? `${reason}` : reasons[code]);
    }
}
