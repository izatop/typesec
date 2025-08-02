import type {Fn, Rec} from "@typesec/the/type";

export type TracerVerbosity = 0 | 1 | 2 | 3;
export type TracerLevel = "warn" | "error" | "log" | "info";

export type TracerStackLine = {
    name: string;
    file: string;
    relative: string;
    line: number;
    position: number;
};

export type TracerOptions = {
    trace: boolean;
    disabled: boolean;
    verbose: number;
    tags: Rec<string, string>;
};

export type TracerWrapTarget = {name: string} | {constructor: {name: string}} | string;
export type TracerFunctionArgs = [...args: unknown[]];
export type TracerList = Rec<TracerLevel, Fn<TracerFunctionArgs>>;

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
