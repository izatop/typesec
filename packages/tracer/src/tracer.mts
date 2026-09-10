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
} from "./interfaces.mjs";
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

function formatArg(arg: unknown): unknown {
    if (arg instanceof ResolveMessage) {
        return arg.toString();
    }

    return arg;
}

function getLogArgs(label: TracerLevel, ...args: TracerFunctionArgs): TracerFunctionArgs {
    const labels = [];

    if (options.trace) {
        const stack = getCallStack();
        labels.unshift(
            ...stack
                .slice(0, 1)
                .map((caller) =>
                    chalk.gray(`| ${caller.name}() at ${caller.relative}:${caller.line}:${caller.position}`),
                ),
            ...stack
                .slice(1)
                .map((caller) =>
                    chalk.gray(`|  > ${caller.name}() at ${caller.relative}:${caller.line}:${caller.position}`),
                ),
            "",
        );
    }

    const tags = Object.entries(options.tags)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ");

    const welcome = `| ${bgs[label].white(label)} { ${tags} }\n`;

    return [
        chalk.gray(welcome),
        labels.join("\n"),
        chalk.gray("-".repeat(100)).concat("\n"),
        formatWithOptions({colors: true, compact: true}, ...args.map(formatArg)),
        "\n",
    ];
}

/**
 * Emits at the lowest severity; printed only at verbosity 3.
 * @category tracing
 */
export function log(...args: TracerFunctionArgs): void {
    if (v(3)) instance.log(getLogArgs("log", ...args).join(""));
}

/**
 * Emits an informational line; printed from verbosity 2.
 * @category tracing
 */
export function info(...args: TracerFunctionArgs): void {
    if (v(2)) instance.info(getLogArgs("info", ...args).join(""));
}

/**
 * Emits a warning; printed from verbosity 1.
 * @category tracing
 */
export function warn(...args: TracerFunctionArgs): void {
    if (v(1)) instance.warn(getLogArgs("warn", ...args).join(""));
}

/**
 * Emits an error; printed at every verbosity unless tracing is disabled.
 * @category tracing
 */
export function error(...args: TracerFunctionArgs): void {
    if (v(0)) instance.error(getLogArgs("error", ...args).join(""));
}

/**
 * Formats a message without colours and without printing it, for error text.
 * @category tracing
 */
export function format(...args: TracerFunctionArgs): string {
    return formatWithOptions({colors: false, compact: true}, ...args);
}

/**
 * Changes tracer options at runtime.
 * @category tracing
 */
export function setTracerOptions(setters: Partial<TracerOptions>) {
    Object.assign(options, setters);
}

/**
 * A tracer that prefixes every message with a label.
 *
 * The label comes from the string, the value's `name`, or its constructor name, so a class can trace as itself.
 * @category tracing
 * @example const trace = wrap("cli");
 */
export function wrap(target: TracerWrapTarget): Tracer {
    const name = is(target, "string") ? target : "name" in target ? target.name : target.constructor.name;

    return fromEntries(
        toEntries(tracer).map(([key, fn]) => [
            key,
            (...[label, ...args]: TracerFunctionArgs) => fn(is(label, "string") ? `${name}> ${label}` : label, ...args),
        ]),
    ) as Tracer;
}

/**
 * The unlabelled tracer.
 * @category tracing
 */
export const tracer: Tracer = {
    log,
    info,
    warn,
    error,
    format,
};
