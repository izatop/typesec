import type {Fn} from "@typesec/the";
import {AsyncLocalStorage} from "node:async_hooks";
import {runtime} from "../runtime.mts";
import {RuntimeController} from "./RuntimeController.mts";

const store = new AsyncLocalStorage<RuntimeController>();

export function useRuntime(): RuntimeController {
    return store.getStore() ?? runtime;
}

export function use(fn: Fn<[RuntimeController]>) {
    const runtime = new RuntimeController();
}
