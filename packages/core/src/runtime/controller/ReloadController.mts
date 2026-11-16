import {assert} from "@typesec/the";
import {store, type IReloadController} from "./hmr.mjs";
import type {RuntimeController} from "./RuntimeController.mjs";

/**
 * Failures of a replaced root's close that a newer root's close carries for its outcome only; each was already routed
 * where it happened, so it is neither traced nor routed again.
 * @internal
 */
export const relayed = new WeakSet<object>();

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

        // The new generation is published first, so the old one's abort listeners see it. The old close drains in the
        // background, and the new root's closure ends with its outcome, not the old root, so terminal shutdown waits for
        // it and a failure reaches every later generation's close, marked so it is not routed a second time.
        if (previous) {
            const drained = previous.close().catch((error: unknown) => {
                if (error instanceof Object) relayed.add(error);

                throw error;
            });

            drained.catch(() => undefined);
            lifecycle.defer(() => drained);
        }

        return globalThis.ReloadController;
    }
}
