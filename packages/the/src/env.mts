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
