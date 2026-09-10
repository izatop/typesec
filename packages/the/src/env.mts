import {assert} from "./assert.mjs";
import {isBlank} from "./blank.mjs";
import {is} from "./fn.mjs";
import object from "./object.mjs";
import type {HasUndefined, KeyOf, RequiresKeysOf} from "./type.mjs";

/**
 * The environments `detectRuntime` can report.
 * @category env
 */
export type RuntimeEnv = "bun" | "node" | "browser" | "unknown";

/**
 * Detects the host environment by probing globals, so the same code can branch on Bun, Node or a browser.
 * @category env
 */
export function detectRuntime(): RuntimeEnv {
    if (typeof globalThis.Bun !== "undefined") return "bun";
    if (typeof globalThis.process !== "undefined" && typeof globalThis.process.versions?.node !== "undefined") {
        return "node";
    }

    if (Reflect.has(globalThis, "window")) {
        return "browser";
    }

    return "unknown";
}

/**
 * A validated environment: the variables themselves, plus `get` and `pick` accessors.
 * @category env
 */
export type EnvRegistry<T extends Dict<string>> = T & {
    get<K extends KeyOf<T, string>>(key: K): T[K];
    pick<K extends KeyOf<T, string>>(keys: K[]): Pick<T, K>;
};

/**
 * Required variables, each mapped to `true` or to a default value.
 * @category env
 */
export type EnvRuleList<T extends Dict<string>> = {
    [K in RequiresKeysOf<T, string>]: HasUndefined<T[K]> extends true ? never : true | string;
};

/**
 * Validates the environment up front and returns a typed registry.
 *
 * Applies defaults, then throws `AssertionError` naming every variable still missing or blank, so a misconfigured process fails at startup rather than at first use.
 * @category env
 * @example createStrict<{PORT: string}>({PORT: "3000"})
 */
export function createStrict<T extends Dict<string>>(requires: EnvRuleList<T>, payload?: Partial<T>): EnvRegistry<T> {
    const env = {...(payload ?? process.env)} as Dict<string>;
    const failed: string[] = [];
    for (const [required, defaultValue] of object.toEntries(requires)) {
        if (!object.hasKeyOf(env, required)) {
            if (is(defaultValue, "string")) {
                env[required] = defaultValue;
            }
        }

        if (isBlank(env[required])) {
            failed.push(required);
        }
    }

    assert(failed.length === 0, `Variables should be defined: ${failed.join(", ")}`);

    return {
        ...env,
        get: (key) => env[key],
        pick: (keys) => {
            return object.fromEntries(keys.map((key) => [key, env[key]]));
        },
    } as EnvRegistry<T>;
}
