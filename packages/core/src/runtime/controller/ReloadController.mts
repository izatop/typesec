import {assert} from "@typesec/the";
import {store, type IReloadController} from "./hmr.mjs";
import type {RuntimeController} from "./RuntimeController.mjs";

export class ReloadController implements IReloadController {
    private constructor() {}

    public get reloadCount(): number {
        return store.reloadCount;
    }

    /**
     * The current generation's root. During a replaced generation's abort and cleanup it is already the new root, so
     * work handed to it there outlives the replaced generation.
     */
    public get lifecycle(): RuntimeController {
        assert(store.lifecycle, "No lifecycle found");

        return store.lifecycle;
    }

    public static watch(lifecycle: RuntimeController): IReloadController {
        const previous = store.lifecycle;
        store.reloadCount += previous ? 1 : 0;
        store.lifecycle = lifecycle;
        globalThis.ReloadController = new this();

        // The new generation is published first, so the old one's abort listeners see it; the old close drains in the
        // background.
        previous?.abort();

        return globalThis.ReloadController;
    }
}
