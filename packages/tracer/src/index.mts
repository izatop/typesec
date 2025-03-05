import type {Rec} from "@typesec/the";
import chalk, {ChalkInstance} from "chalk";
import {Console} from "console";
import {formatWithOptions} from "util";
import {LogVerbosity, TracerOptions} from "./interfaces.mjs";
import {options} from "./options.mjs";
import {getCallStack} from "./parser.mjs";

const instance = new Console({stdout: process.stdout, stderr: process.stderr, colorMode: "auto"});

type Color = ChalkInstance;
type LogArgs = [label: string, ...args: unknown[]];

const v = (level: LogVerbosity) => options.verbose >= level;

type LevelStr = "warn" | "error" | "log" | "info";
const bgs: Rec<LevelStr, Color> = {
    warn: chalk.bgYellow,
    error: chalk.bgRed,
    info: chalk.bgGreen,
    log: chalk.bgBlue,
};

function getLogArgs(label: LevelStr, ...args: LogArgs): LogArgs {
    const labels = [];

    if (options.trace) {
        const [caller] = getCallStack();
        labels.unshift(
            chalk.gray(`@ ${bgs[label].white(caller.name)} at ${caller.relative}:${caller.line}`),
            chalk.gray(`\n>`),
        );
    } else {
        labels.push(chalk.gray(`${bgs[label].white(`${label}`)}`));
    }

    return [labels.join(" "), formatWithOptions({colors: true, compact: true}, ...args), options.trace ? "\n" : ""];
}

export function log(...args: LogArgs): void {
    v(3) && instance.log(...getLogArgs("log", ...args));
}

export function info(...args: LogArgs): void {
    v(2) && instance.info(...getLogArgs("info", ...args));
}

export function warn(...args: LogArgs): void {
    v(1) && instance.warn(...getLogArgs("warn", ...args));
}

export function error(...args: LogArgs): void {
    v(0) && instance.error(...getLogArgs("error", ...args));
}

export function setTracerOptions(setters: Partial<TracerOptions>) {
    Object.assign(options, setters);
}

export const format = (...args: LogArgs) => {
    return formatWithOptions({colors: false, compact: true}, ...args);
};
