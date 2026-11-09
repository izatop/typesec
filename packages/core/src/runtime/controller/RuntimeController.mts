import {assert} from "@typesec/the/assert";
import {identify} from "@typesec/the/object";
import {task} from "@typesec/the/task";
import type {Fn} from "@typesec/the/type";
import {type Tracer, wrap} from "@typesec/tracer";
import {scheduler} from "node:timers/promises";
import {ExitSignals} from "../../const.mjs";
import type {EnvModeType} from "../../env.mjs";
import {DisposableListener} from "../../lib/DisposableListener.mts";
import {withDisposablePending, type WithDisposablePending} from "../../lib/dispostable.mjs";
import {Ref} from "../../lib/Ref.mjs";
import {WeakSequence} from "../../lib/WeakSequence.mts";
import {dispose} from "../dispose.mjs";
import {heartbeat} from "../heartbeat.mjs";
import {ReloadController} from "./ReloadController.mjs";

/**
 * An `AbortController` arranged in a tree, so shutdown cascades.
 *
 * Aborting a parent aborts every child it holds. The root instance traps `SIGINT` and `SIGTERM`, which is how a signal turns into an orderly shutdown of everything the process started.
 * @category runtime
 */
export class RuntimeController extends AbortController implements Disposable {
    /** Identifier used in traces; `lifecycle` for the root, a sequence number otherwise. */
    public readonly id: string;

    readonly #trace: Tracer;
    readonly #parent: RuntimeController | null;
    readonly #children = new Map<AbortController, EventListener>();
    readonly #disposer = new DisposableListener();

    static readonly #ref = new Ref(() => new this(null, "lifecycle"));

    private constructor(parent?: RuntimeController | null, id?: string) {
        super();
        this.id = id ?? WeakSequence.increment(RuntimeController).toString();
        this.#trace = wrap(`[runtime] ${id}`);
        this.#parent = parent ?? null;
        this.#parent?.enqueue(this);
    }

    /** The process-wide root controller, created on first access. */
    public static get lifecycle(): RuntimeController {
        return this.#ref.ensure();
    }

    /** The root controller's abort signal. */
    public static get signal(): AbortSignal {
        return this.lifecycle.signal;
    }

    /** Arms the root controller's signal traps and returns it. */
    public static start = (): RuntimeController => {
        if (this.#ref.persisted) {
            return this.#ref.ensure();
        }

        this.lifecycle.#trace.log("start()");
        this.signal.throwIfAborted();

        ReloadController.watch(this.lifecycle);

        return this.lifecycle.trap();
    };

    /** A fresh child of the root controller. */
    public static clone = (id?: string): RuntimeController => {
        this.lifecycle.#trace.log("clone(%s)", id);

        return this.lifecycle.clone(id);
    };

    /** A child controller that aborts when this one does. */
    public clone = (id?: string): RuntimeController => {
        return new RuntimeController(this, id);
    };

    /** Whether this is the process-wide root controller. */
    public isLifecycle = (): boolean => {
        return this === RuntimeController.lifecycle;
    };

    /** Whether the controller has not aborted yet. */
    public isRunning = (): boolean => {
        return !this.signal.aborted;
    };

    /** The run mode from `NODE_ENV`, defaulting to `development`. */
    public get mode(): EnvModeType | string {
        return process.env["NODE_ENV"] ?? "development";
    }

    /** Whether hot module replacement is requested through `NODE_HMR`. */
    public get hmr(): boolean {
        return process.env["NODE_HMR"] === "Y";
    }

    /** Waits for this controller to abort, then runs the given cleanup. */
    public heartbeat = <R extends any = void>(dispose?: Fn<[], R>): Promise<R> => {
        return heartbeat(this).then(dispose);
    };

    /** Whether the run mode is `production`. */
    public isProduction = (): boolean => {
        return this.mode === "production";
    };

    /** Whether the run mode is anything but `production`. */
    public isNotProduction = (): boolean => {
        return !this.isProduction();
    };

    /** Whether the run mode is `development`. */
    public isDevelopment = (): boolean => {
        return this.mode === "development";
    };

    /** Whether the run mode is `test`. */
    public isTest = (): boolean => {
        return this.mode === "test";
    };

    /** Whether the run mode is `stage`. */
    public isStage = (): boolean => {
        return this.mode === "stage";
    };

    /** Asserts the process runs in the given mode, for work that must not happen elsewhere. */
    public only = (mode?: EnvModeType, message?: string): void => {
        assert(!mode || mode === this.mode, message ?? `Only available in the ${mode} mode only`);
    };

    /** Runs a task under this controller, holding the event loop open while it works. */
    public run = <R,>(task: Fn<[], R>, lock = true): WithDisposablePending<R> => {
        return withDisposablePending(lock ? this.runWithLock(task) : task(), () => dispose(this));
    };

    /** Runs a task with a timer held open, so an idle event loop does not end the process early. */
    public runWithLock = async <R,>(task: Fn<[], R>): Promise<R> => {
        const lock = setTimeout(() => void 0, Infinity);

        try {
            return await task();
        } finally {
            clearTimeout(lock);
        }
    };

    /** Registers the exit-signal handlers, once per controller. */
    public trap = (): this => {
        assert(!ExitSignals.some((signal) => process.listeners(signal).includes(this.abort)), "trap(): already called");

        this.#trace.log("trap(%o)", ExitSignals);
        for (const signal of ExitSignals) {
            process.once(signal, this.abort);
            this.#disposer.defer(() => process.removeListener(signal, this.abort));
        }

        this.#disposer.createDisposableListener(
            () => dispose(this),
            (fn) => this.signal.addEventListener("abort", fn, {once: true}),
            (fn) => this.signal.removeEventListener("abort", fn),
        );

        const locker = setInterval(() => void 0, 1_000_000_000);
        this.#disposer.createDisposableListener(
            () => clearInterval(locker),
            (fn) => this.signal.addEventListener("abort", fn, {once: true}),
            (fn) => this.signal.removeEventListener("abort", fn),
        );

        return this;
    };

    /** Aborts the controller once, detaches it from its parent and releases the signal traps. */
    public override abort = (reason?: unknown): this => {
        if (this.signal.aborted) {
            this.#trace.warn("abort(%s): already aborted");

            return this;
        }

        this.#trace.log("abort(%s)", reason);

        super.abort(reason);
        this.#parent?.detach(this);
        ExitSignals.forEach((signal) => process.off(signal, this.abort));

        return this;
    };

    /** Whether the controller holds this child. */
    public has = (child: AbortController): boolean => {
        this.#trace.log("has(%s)", identify(child));

        return this.#children.has(child);
    };

    /** Attaches a child so it aborts with this controller; aborts it at once when this one already has. */
    public enqueue = (child: AbortController, throwIfAborted = false): this => {
        this.#trace.log("enqueue(%s)", identify(child));

        if (throwIfAborted) {
            assert(!this.signal.aborted, this.#trace.format("enqueue(%s): parent already aborted", identify(child)));
            assert(!child.signal.aborted, this.#trace.format("enqueue(%s): child already aborted", identify(child)));
        }

        if (this.signal.aborted) {
            child.abort(this.#trace.format("enqueue(%s): parent instance already aborted", identify(child)));

            return this;
        }

        const onAbort = this.#disposer.createDisposableListener(
            () => child.abort(),
            (fn) => this.signal.addEventListener("abort", fn, {once: true}),
            (fn) => this.signal.removeEventListener("abort", fn),
        );

        this.#children.set(child, onAbort);

        return this;
    };

    /** Removes a child from the cascade. */
    public detach = (child: AbortController) => {
        this.#trace.log("detach(%s)", identify(child));
        const listener = this.#children.get(child);
        if (listener) {
            this.signal.removeEventListener("abort", listener);
            this.#children.delete(child);
        }
    };

    /** Waits, returning early and without throwing when the controller aborts. */
    public wait = (ms: number): Promise<void> => {
        return task.tolerant(scheduler.wait(ms, {signal: this.signal}));
    };

    public [Symbol.dispose](): void {
        for (const child of this.#children.keys()) {
            this.detach(child);
        }

        this.#children.clear();
        this.#disposer.dispose();
        this.#trace.log("disposed");
    }
}
