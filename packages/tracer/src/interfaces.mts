import type {Fn, Rec} from "@typesec/the/type";

/**
 * How much is printed: `0` errors only, `1` adds warnings, `2` adds info, `3` adds logs.
 * @category tracing
 */
export type TracerVerbosity = 0 | 1 | 2 | 3;
/**
 * The severity levels a tracer emits.
 * @category tracing
 */
export type TracerLevel = "warn" | "error" | "log" | "info";

/**
 * One parsed frame of a call stack, with a path relative to the tracer.
 * @category tracing
 */
export type TracerStackLine = {
    name: string;
    file: string;
    relative: string;
    line: number;
    position: number;
};

/**
 * Tracer configuration: stack traces, verbosity, a kill switch, and tags added to every line.
 * @category tracing
 */
export type TracerOptions = {
    trace: boolean;
    disabled: boolean;
    verbose: number;
    tags: Rec<string, string>;
};

/**
 * What `wrap` can take a label from: a string, a named value, or an instance.
 * @category tracing
 */
export type TracerWrapTarget = {name: string} | {constructor: {name: string}} | string;
/**
 * Arguments of a tracer call: a format string and its values, as `console` takes them.
 * @category tracing
 */
export type TracerFunctionArgs = [...args: unknown[]];
/**
 * One emit function per level.
 * @category tracing
 */
export type TracerList = Rec<TracerLevel, Fn<TracerFunctionArgs>>;

/**
 * A tracer: one function per level, plus `format` for building a message without printing it.
 * @category tracing
 */
export type Tracer = TracerList & {
    format: Fn<TracerFunctionArgs, string>;
};

declare module "bun" {
    interface Env {
        TRACE?: string;
        TRACE_TESTS?: string;
        VERBOSE?: string;
    }
}
