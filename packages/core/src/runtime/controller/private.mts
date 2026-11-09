import type {Promisify} from "@typesec/the";
import type {RuntimeController} from "./RuntimeController.mts";

export const ReloaderStoreKey = Symbol.for("@typesec/core?reload-store-key");

export type ReloadStore = {
    controllers: Map<number, RuntimeController>;
    reload(lifecycle: RuntimeController): void;
};

export type RuntimeStore = {
    [ReloaderStoreKey]: ReloadStore;
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
