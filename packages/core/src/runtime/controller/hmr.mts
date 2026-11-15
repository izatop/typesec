import type {Promisify} from "@typesec/the";
import {AsyncLocalStorage} from "node:async_hooks";
import type {RuntimeController} from "./RuntimeController.mts";

export const ReloaderStoreKey = Symbol.for("@typesec/core?reload-store-key");

/**
 * Process-wide data that survives a hot reload: the current generation's lifecycle, the number of reloads and the
 * shared async-context host. It holds no code, so no generation's module graph is kept alive through it.
 */
export type ReloadData = {
    lifecycle?: RuntimeController;
    reloadCount: number;
    context: AsyncLocalStorage<RuntimeController>;
};

export type RuntimeStore = {
    [ReloaderStoreKey]?: ReloadData;
};

export type RuntimeGlobals = typeof globalThis & RuntimeStore;
export type ReloadFunction = {
    (): Promisify<unknown>;
};

export interface IReloadController {
    readonly reloadCount: number;
    readonly lifecycle: RuntimeController;
    readonly previous?: RuntimeController;
}

declare global {
    var ReloadController: IReloadController;
}

/**
 * The one store of this process.
 *
 * This module imports nothing from the runtime graph, so it evaluates before every module that reads the store,
 * whichever entry starts the import cycle; a graph re-evaluated by hot reload adopts what the first generation created.
 */
export const store: ReloadData = ((globalThis as RuntimeGlobals)[ReloaderStoreKey] ??= {
    reloadCount: 0,
    context: new AsyncLocalStorage(),
});
