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
