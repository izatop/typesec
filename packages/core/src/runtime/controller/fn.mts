import {AsyncLocalStorage} from "node:async_hooks";
import {RuntimeController} from "./RuntimeController.mts";

const store = new AsyncLocalStorage<RuntimeController>();

export function useRuntime(): RuntimeController {
    return store.getStore() ?? RuntimeController.lifecycle;
}
