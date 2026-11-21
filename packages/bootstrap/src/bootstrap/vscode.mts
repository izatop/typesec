import {isDeepStrictEqual} from "node:util";

type Settings = {[key: string]: unknown};

function isSettings(value: unknown): value is Settings {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function merge(current: Settings, template: Settings): Settings {
    const entries = Object.entries(template).map(([key, value]) => {
        const previous = Object.hasOwn(current, key) ? current[key] : undefined;
        const merged = isSettings(previous) && isSettings(value) ? merge(previous, value) : value;

        return [key, merged];
    });

    return {...current, ...Object.fromEntries(entries)};
}

/** Merges VS Code JSONC settings; template values win and deletions name literal top-level keys. */
export function mergeVscodeSettings(current: string, template: string, deletions: string): string {
    const own: unknown = Bun.JSONC.parse(current);
    const wanted: unknown = Bun.JSONC.parse(template);
    const removed: unknown = JSON.parse(deletions);

    if (!isSettings(own) || !isSettings(wanted)) {
        throw new Error("VS Code settings.json must contain an object.");
    }

    if (!Array.isArray(removed) || !removed.every((key) => typeof key === "string")) {
        throw new Error("VS Code settings-deletions.json must contain an array of setting names.");
    }

    const result = merge(own, wanted);

    for (const key of removed) delete result[key];

    return isDeepStrictEqual(result, own) ? current : `${JSON.stringify(result, null, 2)}\n`;
}
