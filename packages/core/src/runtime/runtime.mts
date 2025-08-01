import type {Fn, Prop} from "@typesec/the/type";
import {AsyncLocalStorage} from "node:async_hooks";
import lifecycle, {RuntimeController} from "./controller/RuntimeController.mjs";
import {RuntimeSequence} from "./controller/RuntimeSequence.mts";

export type RuntimePick<K extends keyof RuntimeController> = Prop<RuntimeController, K>;

export type Runtime = {
    use(): RuntimeController;
    readonly controller: RuntimeController;
    readonly mode: RuntimePick<"mode">;
    isRunning: RuntimePick<"isRunning">;
    isTest: RuntimePick<"isTest">;
    isDevelopment: RuntimePick<"isDevelopment">;
    isProduction: RuntimePick<"isProduction">;
    enqueue: RuntimePick<"enqueue">;
    heartbeat: RuntimePick<"heartbeat">;
    abort: RuntimePick<"abort">;
    only: RuntimePick<"only">;
    increment: () => number;
    runWith<R>(context: RuntimeController, fn: Fn<[context: RuntimeController], R>): R;
    run<R>(fn: Fn<[context: RuntimeController], R>): R;
};

const store = new AsyncLocalStorage<RuntimeController>();

function use(): RuntimeController {
    return store.getStore() ?? RuntimeController.lifecycle;
}

export const runtime: Runtime = {
    use,
    get controller() {
        return this.use();
    },
    get mode() {
        return this.controller.mode;
    },
    isRunning() {
        return this.controller.isRunning();
    },
    isDevelopment() {
        return this.controller.isDevelopment();
    },
    isProduction() {
        return this.controller.isProduction();
    },
    isTest() {
        return this.controller.isTest();
    },
    only(mode) {
        return this.controller.only(mode);
    },
    abort(reason) {
        return this.controller.abort(reason);
    },
    enqueue(ctrl, throwIfAborted) {
        return this.controller.enqueue(ctrl, throwIfAborted);
    },
    heartbeat(dispose) {
        return this.controller.heartbeat(dispose);
    },
    increment() {
        return RuntimeSequence.increment(RuntimeController);
    },
    run(fn) {
        return store.run(this.controller, () => fn(this.controller));
    },
    runWith(context, fn) {
        return store.run(context, () => fn(this.controller));
    },
};

export {lifecycle};
