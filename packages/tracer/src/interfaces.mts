export type TracerLevel = "warn" | "error" | "log" | "info";

export type TracerStackLine = {
    name: string;
    file: string;
    relative: string;
    line: number;
    position: number;
};

export type TracerOptions = {
    trace?: boolean;
    verbose: number;
};

export type LogVerbosity = 0 | 1 | 2 | 3;

declare module "bun" {
    interface Env {
        TRACE: string;
        VERBOSE: string;
    }
}
