import type {Fn, Prop} from "@typesec/the/type";
import {AsyncLocalStorage} from "node:async_hooks";
import {withDisposablePending, type WithDisposablePending} from "../lib/dispostable.mjs";
import lifecycle, {RuntimeController} from "./controller/RuntimeController.mjs";
import {RuntimeSequence} from "./controller/RuntimeSequence.mjs";
import {dispose} from "./dispose.mjs";

/**
 * One member of `RuntimeController`, as re-exposed on `runtime`.
 * @category runtime
 */
export type RuntimePick<K extends keyof RuntimeController> = Prop<RuntimeController, K>;

/**
 * The ambient runtime facade: mode checks, controller access, task execution.
 * @category runtime
 */
export type Runtime = {
    use(): RuntimeController;
    readonly name: string;
    readonly lifecycle: RuntimeController;
    readonly controller: RuntimeController;
    readonly mode: RuntimePick<"mode">;
    readonly hmr: RuntimePick<"hmr">;
    isRunning: RuntimePick<"isRunning">;
    isTest: RuntimePick<"isTest">;
    isStage: RuntimePick<"isStage">;
    isDevelopment: RuntimePick<"isDevelopment">;
    isProduction: RuntimePick<"isProduction">;
    isNotProduction: RuntimePick<"isNotProduction">;
    enqueue: RuntimePick<"enqueue">;
    heartbeat: RuntimePick<"heartbeat">;
    abort: RuntimePick<"abort">;
    only: RuntimePick<"only">;
    wait: RuntimePick<"wait">;
    signal: AbortSignal;
    increment: () => number;
    run<R>(task: Fn<[], R>, withContext?: RuntimeController): WithDisposablePending<R>;
};

const store = new AsyncLocalStorage<RuntimeController>();

function use(): RuntimeController {
    return store.getStore() ?? RuntimeController.lifecycle;
}

/**
 * The ambient runtime, resolved per async context.
 *
 * Reads the controller from `AsyncLocalStorage`, so code inside `runtime.run` sees its own context and everything else falls back to the process lifecycle.
 * @category runtime
 * @example if (runtime.isProduction()) ...
 */
export const runtime: Runtime = {
    /** The controller for the current async context, or the process lifecycle outside one. */
    use,
    /** A name derived from the working directory, used to tag traces. */
    get name() {
        return process.cwd().split("/").slice(3).join("_");
    },
    /** Abort signal of the current controller. */
    get signal() {
        return this.use().signal;
    },
    /** The process-wide root controller. */
    get lifecycle() {
        return lifecycle;
    },
    /** The controller for the current async context. */
    get controller() {
        return this.use();
    },
    /** The run mode from `NODE_ENV`. */
    get mode() {
        return this.controller.mode;
    },
    /** Whether hot module replacement is requested. */
    get hmr() {
        return this.controller.hmr;
    },
    /** Whether the current controller has not aborted. */
    isRunning() {
        return this.controller.isRunning();
    },
    /** Whether the run mode is `development`. */
    isDevelopment() {
        return this.controller.isDevelopment();
    },
    /** Whether the run mode is `production`. */
    isProduction() {
        return this.controller.isProduction();
    },
    /** Whether the run mode is anything but `production`. */
    isNotProduction() {
        return this.controller.isNotProduction();
    },
    /** Whether the run mode is `test`. */
    isTest() {
        return this.controller.isTest();
    },
    /** Whether the run mode is `stage`. */
    isStage() {
        return this.controller.isStage();
    },
    /** Asserts the process runs in the given mode. */
    only(mode) {
        return this.controller.only(mode);
    },
    /** Aborts the current controller, cascading to its children. */
    abort(reason) {
        return this.controller.abort(reason);
    },
    /** Attaches a controller to the current one, so it aborts with it. */
    enqueue(ctrl, throwIfAborted) {
        return this.controller.enqueue(ctrl, throwIfAborted);
    },
    /** Waits until the current controller aborts, then runs the cleanup. */
    heartbeat(dispose) {
        return this.controller.heartbeat(dispose);
    },
    /** Next value of the runtime-wide sequence. */
    increment() {
        return RuntimeSequence.increment(RuntimeController);
    },
    /** Waits, returning early when the controller aborts. */
    wait(ms) {
        return this.controller.wait(ms);
    },
    /** Runs a task in its own async context, so nested code sees that controller. */
    run(task, withContext) {
        const controller = withContext ?? this.controller;

        return withDisposablePending(store.run(controller, task), () => dispose(this.controller));
    },
};

/**
 * The process-wide root controller.
 * @category runtime
 */
export {lifecycle};
