import type {Rec} from "@typesec/the";
import {error, log} from "@typesec/tracer";
import {dispose} from "./dispose.mjs";
import {type MainFunction} from "./interfaces.mjs";

const reasons: Rec = {0: "No errors"};

function exit(code: number, reason: unknown = null): Timer {
    const fn = code > 0 ? error : log;
    fn("exit(%d): %o", code, reason ?? reasons[code]);

    return setImmediate(() => process.exit(code));
}

export async function watch(main: MainFunction): Promise<Timer> {
    log("main.lock()");
    const tick = setInterval(() => void 0, 1_000_000);

    try {
        const fn = main.name || "fn";
        log("%s(): *res", fn);
        const res = await main();
        await dispose(res);

        return exit(0);
    } catch (reason) {
        return exit(1, reason);
    } finally {
        log("main.release()");
        clearInterval(tick);
    }
}
