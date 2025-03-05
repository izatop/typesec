import {TracerOptions} from "./interfaces.mjs";

export const options: TracerOptions = {
    trace: Boolean(process.env.TRACE),
    verbose: process.env.VERBOSE?.length ?? 2,
};
