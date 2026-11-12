import type {Promisify} from "@typesec/the";
import {AsyncLocalStorage} from "node:async_hooks";
import type {RuntimeController} from "./RuntimeController.mts";

export const ReloaderStoreKey = Symbol.for("@typesec/core?reload-store-key");

/** Process-wide state that survives a hot reload: the lifecycle of each generation and the shared async-context host. */
export type ReloadData = {
    controllers: Map<number, RuntimeController>;
    context: AsyncLocalStorage<RuntimeController>;
};

export type ReloadStore = ReloadData & {
    reload(lifecycle: RuntimeController): void;
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
    controllers: new Map(),
    context: new AsyncLocalStorage(),
});
