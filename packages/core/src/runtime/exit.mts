import type {Rec} from "@typesec/the";
import type {Fn} from "@typesec/the/type";
import {Ref} from "../lib/Ref.mts";
import {tracer} from "../tracer.mts";

export type ExitFunction = Fn<[code: number, reason: unknown], void>;

const reasons: Rec = {0: "Graceful exit", 1: "Unknown error"};
const shutdown = new Ref<ExitFunction>(() => (code) => process.exit(code));

export function exit(code: number = 0, reason: unknown = null): Timer {
    const finalize = shutdown.ensure();
    const log = code > 0 ? tracer.error : tracer.info;

    try {
        return setImmediate(() => finalize(code, reason)) as unknown as Timer;
    } finally {
        log("exit(%d): %o", code, reason ? `${reason}` : reasons[code]);
    }
}

export function setShutdownFunction(fn: ExitFunction): void {
    shutdown.replace(fn);
}
