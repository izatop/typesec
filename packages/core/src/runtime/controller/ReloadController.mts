import {assert} from "@typesec/the";
import {ReloaderStoreKey, store, type IReloadController, type ReloadStore} from "./hmr.mts";
import {RuntimeController} from "./RuntimeController.mts";

export class ReloadController implements IReloadController {
    #reloadCount = 0;

    readonly #store: ReloadStore;

    private constructor() {
        this.#store = Object.assign(store, {reload: this.#reload});
    }

    public get [ReloaderStoreKey](): ReloadStore {
        return this.#store;
    }

    public get reloadCount(): number {
        return this.#reloadCount;
    }

    public get lifecycle(): RuntimeController {
        const lifecycle = this.#store.controllers.get(this.reloadCount);
        assert(lifecycle, "No lifecycle found");

        return lifecycle;
    }

    public static watch(lifecycle: RuntimeController): IReloadController {
        const rc = (globalThis.ReloadController ??= new this()) as ReloadController;
        rc[ReloaderStoreKey].reload(lifecycle);

        return rc;
    }

    #reload = (lifecycle: RuntimeController): void => {
        const previous = this.#store.controllers.get(this.reloadCount);
        this.#store.controllers.delete(this.reloadCount);

        if (previous) {
            this.#increment();

            using _ = previous.abort();
        }

        this.#store.controllers.set(this.reloadCount, lifecycle);
    };

    #increment = (): void => {
        this.#reloadCount++;
    };
}
