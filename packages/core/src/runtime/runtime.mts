import {assert} from "@typesec/the/assert";
import type {Prop} from "@typesec/the/type";

import {toAsyncDisposable} from "../lib/dispostable.mjs";
import {WeakSequence} from "../lib/WeakSequence.mts";
import {registration} from "../service/registration.mjs";
import {store} from "./controller/hmr.mjs";
import {RuntimeClosedException, RuntimeController} from "./controller/index.mjs";
import {lifecycle} from "./controller/index.mts";
import type {Task} from "./interfaces.mjs";

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
    run<R>(task: Task<R>, withContext?: RuntimeController): Promise<R>;
};

function use(): RuntimeController {
    return store.context.getStore() ?? RuntimeController.lifecycle;
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
        return WeakSequence.increment(RuntimeController);
    },
    /** Waits, returning early when the controller aborts. */
    wait(ms) {
        return this.controller.wait(ms);
    },
    /**
     * Runs a task as tracked work of the current controller, or owns the one passed explicitly.
     *
     * The current controller stays open. An explicit one is closed once the task settles, whichever way, and its cleanup
     * is awaited: a cleanup failure rejects the call, with the task's own error attached as `SuppressedError.suppressed`.
     * One that has begun closing rejects with `RuntimeClosedException` once its cleanup finishes, without calling the
     * task. Passing the current controller is refused: owning it would await a closure that waits for this call.
     *
     * Entered from outside every controller, as at startup, it first waits until every eager service build the
     * generation's root registered (`lazy: false`) has settled, and rejects with the first failure in
     * registration order without calling the task; a failed build keeps rejecting until `unload` forgets it. A run
     * nested in a controller's work, including one a factory starts, does not wait, since it could wait for its own
     * build.
     */
    async run(task, withContext) {
        assert(!withContext || withContext !== store.context.getStore(), "run(): cannot own the current controller");
        await using _closing = toAsyncDisposable(() => withContext?.close());

        // Warming up inside the tracked work keeps the closed check synchronous and makes closure wait for it; a
        // controller that began closing meanwhile refuses the task as it would have before the warmup.
        const controller = withContext ?? this.use();
        const warmup = store.context.getStore() ? undefined : registration.warmup;
        const work = warmup
            ? async () => {
                  await warmup();
                  assert(controller.isRunning(), () => new RuntimeClosedException(controller));

                  return task();
              }
            : task;

        return await controller.run(work);
    },
};
