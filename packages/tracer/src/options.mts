import {hostname} from "os";
import {type TracerOptions} from "./interfaces.mjs";

export const options: TracerOptions = {
    trace: Boolean(process.env["TRACE"]),
    disabled: process.env.NODE_ENV === "test" && !process.env["TRACE_TESTS"],
    verbose: process.env["VERBOSE"]?.length ?? 2,
    welcome: createWelcomeString(),
};

export function createWelcomeString() {
    if ("process" in global) {
        return `> ${hostname()} [${process.pid}]`;
    }
}
