import {relative} from "node:path/posix";
import {TracerStackLine} from "./interfaces.mjs";

const lineMatch = /([^\s]+)\s\((.+):(\d+):(\d+)\)/;
const {pathname} = new URL(import.meta.url);

function parseLine(str: string): TracerStackLine {
    const [, name, file, line, position] = str.match(lineMatch) ?? [, "unknown", "unknown", 0, 0];

    return {
        name,
        file,
        line: +line,
        position: +position,
        relative: relative(pathname, file.replace("file://", "")).replaceAll("../", ""),
    };
}

export function getCallStack(): TracerStackLine[] {
    const err = new Error();
    Error.captureStackTrace(err, getCallStack);
    const stack = err.stack?.split(/\s+at\s+/) ?? [];

    return stack.slice(3).map(parseLine);
}
