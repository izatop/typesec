import type {Rec} from "@typesec/the";
import type {Fn} from "@typesec/the/type";
import {Ref} from "../lib/Ref.mjs";
import {tracer} from "../tracer.mjs";

/**
 * What actually terminates the process; replaceable for tests.
 * @category runtime
 */
export type ExitFunction = Fn<[code: number, reason: unknown], void>;

const reasons: Rec = {0: "Graceful exit", 1: "Unknown error"};
const shutdown = new Ref<ExitFunction>(() => (code) => process.exit(code));

/**
 * Schedules process shutdown on the next tick, tracing the code and reason.
 * @category runtime
 */
export function exit(code: number = 0, reason: unknown = null): Timer {
    const finalize = shutdown.ensure();
    const log = code > 0 ? tracer.error : tracer.info;

    try {
        return setImmediate(() => finalize(code, reason)) as unknown as Timer;
    } finally {
        log("exit(%d): %o", code, reason ? `${reason}` : reasons[code]);
    }
}

/**
 * Replaces the shutdown function, so a test can observe an exit instead of ending the process.
 * @category runtime
 * @category testing
 */
export function setShutdownFunction(fn: ExitFunction): void {
    shutdown.replace(fn);
}
