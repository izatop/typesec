import {isBlank} from "./blank.mts";
import {is} from "./fn.mts";
import object from "./object.mts";
import type {HasUndefined, KeyOf, RequiresKeysOf} from "./type.mts";

export type RuntimeEnv = "bun" | "node" | "browser" | "unknown";

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

export type EnvRegistry<T extends Dict<string>> = T & {
    get<K extends KeyOf<T, string>>(key: K): T[K];
    pick<K extends KeyOf<T, string>>(keys: K[]): Pick<T, K>;
};

export type EnvRuleList<T extends Dict<string>> = {
    [K in RequiresKeysOf<T, string>]: HasUndefined<T[K]> extends true ? never : true | string;
};

export function createStrict<T extends Dict<string>>(requires: EnvRuleList<T>): EnvRegistry<T> {
    const env = {...process.env};
    const failed: string[] = [];
    for (const [required, defaultValue] of object.toEntries(requires)) {
        if (!object.hasKeyOf(env, required)) {
            if (is(defaultValue, "string")) {
                env[required] = defaultValue;
            }

            if (isBlank(env[required])) {
                failed.push(required);
            }
        }
    }

    return {
        ...env,
        get: (key) => env[key],
        pick: (keys) => {
            return object.fromEntries(keys.map((key) => [key, env[key]]));
        },
    } as EnvRegistry<T>;
}
