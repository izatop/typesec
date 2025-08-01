import type {Rec} from "@typesec/the";
import {log, wrap} from "@typesec/tracer";
import {dispose} from "./dispose.mjs";
import {type Task} from "./interfaces.mjs";
import {runtime} from "./runtime.mts";

const trace = wrap("watch");
const reasons: Rec = {0: "No errors"};

function exit(code: number, reason: unknown = null): Timer {
    const fn = code > 0 ? trace.error : trace.info;
    fn("[main] exit(%d): %o", code, reason ? `${reason}` : reasons[code]);

    // @TODO bun's types are conflicting with node's
    return runtime.isTest()
        ? (setImmediate(() => void 0) as unknown as Timer)
        : (setImmediate(() => process.exit(code)) as unknown as Timer);
}

export async function run(task: Task): Promise<Timer> {
    trace.log("[main] lock()");
    using cycle = runtime.use();
    const tick = setInterval(() => log("[main] tick()"), runtime.isProduction() ? 10_000_000 : 10_000);

    try {
        const fn = task.name || "fn";
        trace.log("[main] %s(): *res", fn);

        const res = await task();
        await dispose(res);

        return exit(0);
    } catch (reason) {
        return exit(1, reason);
    } finally {
        trace.log("[main] release()");
        clearInterval(tick);
    }
}

/**
 * @deprecated use run(task) instead
 */
export const watch = run;
