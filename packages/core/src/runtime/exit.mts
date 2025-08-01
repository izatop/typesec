import type {Rec} from "@typesec/the";
import type {Fn} from "@typesec/the/type";
import * as tracer from "@typesec/tracer";
import {Ref} from "../lib/Ref.mts";

export type ExitFunction = Fn<[code: number], void>;

const reasons: Rec = {0: "No errors"};
const shutdown = new Ref<ExitFunction>(() => (code) => process.exit(code));

export function exit(code: number = 0, reason: unknown = null): Timer {
    const finalize = shutdown.ensure();
    const log = code > 0 ? tracer.error : tracer.info;
    log("[main] exit(%d): %o", code, reason ? `${reason}` : reasons[code]);

    // @TODO node.js/bun types are conflicting
    return setImmediate(() => finalize(code)) as unknown as Timer;
}

export function setShutdownFunction(fn: ExitFunction): void {
    shutdown.replace(fn);
}
