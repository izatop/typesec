import {detectRuntime} from "@typesec/the/env";
import type {Rec} from "@typesec/the/type";
import {hostname} from "node:os";
import {type TracerOptions} from "./interfaces.mjs";

export const options: TracerOptions = {
    trace: Boolean(process.env["TRACE"]),
    disabled: process.env.NODE_ENV === "test" && !process.env["TRACE_TESTS"],
    verbose: process.env["VERBOSE"]?.length ?? 2,
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
