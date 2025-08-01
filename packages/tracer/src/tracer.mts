import type {Rec} from "@typesec/the";
import {is} from "@typesec/the/fn";
import {fromEntries, toEntries} from "@typesec/the/object";
import chalk, {type ChalkInstance} from "chalk";
import {Console} from "console";
import {formatWithOptions} from "util";
import {getCallStack} from "./helpers.mjs";
import type {
    Tracer,
    TracerFunctionArgs,
    TracerLevel,
    TracerOptions,
    TracerVerbosity,
    TracerWrapTarget,
} from "./interfaces.mts";
import {options} from "./options.mjs";

const instance = new Console({stdout: process.stdout, stderr: process.stderr, colorMode: "auto"});

type Color = ChalkInstance;

const v = (level: TracerVerbosity): boolean => {
    if (options.disabled) {
        return false;
    }

    return options.verbose >= level;
};

const bgs: Rec<TracerLevel, Color> = {
    warn: chalk.bgYellow,
    error: chalk.bgRed,
    info: chalk.bgGreen,
    log: chalk.bgBlue,
};

function getLogArgs(label: TracerLevel, ...args: TracerFunctionArgs): TracerFunctionArgs {
    const labels = [];

    if (options.welcome) {
        labels.push(chalk.gray(options.welcome));
    }

    if (options.trace) {
        const stack = getCallStack();
        labels.unshift(
            ...stack.flatMap((caller) => [
                chalk.gray(`@ ${bgs[label].white(caller?.name)} at ${caller?.relative}:${caller?.line}`),
                "\n",
            ]),
            chalk.gray(`\n>`),
        );
    } else {
        labels.push(chalk.gray(`${bgs[label].white(`${label}`)}`));
    }

    return [labels.join(" "), formatWithOptions({colors: true, compact: true}, ...args), options.trace ? "\n" : ""];
}

export function log(...args: TracerFunctionArgs): void {
    v(3) && instance.log(...getLogArgs("log", ...args));
}

export function info(...args: TracerFunctionArgs): void {
    v(2) && instance.info(...getLogArgs("info", ...args));
}

export function warn(...args: TracerFunctionArgs): void {
    v(1) && instance.warn(...getLogArgs("warn", ...args));
}

export function error(...args: TracerFunctionArgs): void {
    v(0) && instance.error(...getLogArgs("error", ...args));
}

export function format(...args: TracerFunctionArgs): string {
    return formatWithOptions({colors: false, compact: true}, ...args);
}

export function setTracerOptions(setters: Partial<TracerOptions>) {
    Object.assign(options, setters);
}

export function wrap(target: TracerWrapTarget): Tracer {
    const name = is(target, "string") ? target : "name" in target ? target.name : target.constructor.name;

    return fromEntries(
        toEntries(tracer).map(([key, fn]) => [
            key,
            (...[label, ...args]: TracerFunctionArgs) => {
                return fn(is(label, "string") ? label.replace(/^\?/, name) : label, ...args);
            },
        ]),
    );
}

export const tracer: Tracer = {
    log,
    info,
    warn,
    error,
};
