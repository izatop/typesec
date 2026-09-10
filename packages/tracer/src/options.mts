import {detectRuntime} from "@typesec/the/env";
import type {Rec} from "@typesec/the/type";
import {hostname} from "node:os";
import {type TracerOptions} from "./interfaces.mjs";

/**
 * Live tracer options, read from the environment at import.
 *
 * `TRACE` turns on stack frames, `VERBOSE` sets the level, and tracing is off under `NODE_ENV=test` unless `TRACE_TESTS` is set.
 * @category tracing
 */
export const options: TracerOptions = {
    /** Whether to print call-stack frames with each line. */
    trace: Boolean(process.env["TRACE"]),
    /** Whether output is suppressed entirely. */
    disabled: process.env.NODE_ENV === "test" && !process.env["TRACE_TESTS"],
    /** The highest level that still prints. */
    verbose: process.env["VERBOSE"]?.length ?? 2,
    /** Key-value tags attached to every line, such as pid and hostname. */
    tags: getTags(),
};

function getTags(): Rec<string, string> {
    switch (detectRuntime()) {
        case "bun":
        case "node":
            return {
                pid: `${process.pid}`,
                hostname: hostname(),
            };
    }

    return {};
}
