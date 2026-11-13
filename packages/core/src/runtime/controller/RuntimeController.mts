import {assert, AssertionException} from "@typesec/the/assert";
import {identify} from "@typesec/the/object";
import {task} from "@typesec/the/task";
import type {Fn, Promisify} from "@typesec/the/type";
import {type Tracer, wrap} from "@typesec/tracer";
import {scheduler} from "node:timers/promises";
import {ExitSignals} from "../../const.mjs";
import type {EnvModeType} from "../../env.mjs";
import {DisposableListener} from "../../lib/DisposableListener.mts";
import {toAsyncDisposable} from "../../lib/dispostable.mjs";
import {Ref} from "../../lib/Ref.mjs";
import {WeakSequence} from "../../lib/WeakSequence.mts";
import {DisposalEntry} from "../DisposalEntry.mjs";
import {heartbeat} from "../heartbeat.mjs";
import {store} from "./hmr.mjs";
import {ReloadController} from "./ReloadController.mjs";
import {RuntimeClosedException} from "./RuntimeClosedException.mjs";

/** The controller that owns each resource, so no resource is adopted by two controllers. */
const owners = new WeakMap<Disposable | AsyncDisposable, RuntimeController>();

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
    readonly #resources: DisposalEntry[] = [];
    readonly #entries = new WeakMap<Disposable | AsyncDisposable, DisposalEntry>();
    readonly #pending = new Set<Promise<void>>();

    // Admission ends once; later cleanup batches may cycle between closing and closed.
    #state:
        | {status: "open"}
        | {status: "closing"; promise: Promise<void>; errors: unknown[]}
        | {status: "closed"; promise: Promise<void>} = {status: "open"};

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

    /** A fresh child owned by the root controller, whose closure waits for the child's work and cleanup. */
    public static clone = (id?: string): RuntimeController => {
        this.lifecycle.#trace.log("clone(%s)", id);

        return this.lifecycle.clone(id);
    };

    /** Creates an owned child; abort cascades to it, and closure waits for its work and cleanup. */
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

    /**
     * Runs a task in this controller's async context as its tracked work, leaving the controller open for more.
     *
     * Nested code sees this controller through `runtime.use()`, and closure waits for the task. A controller that has
     * begun closing throws `RuntimeClosedException` synchronously, without calling the task.
     * @category runtime
     */
    public run = <R,>(task: Fn<[], Promisify<R>>): Promise<R> => {
        return this.track(() => store.context.run(this, task));
    };

    /**
     * Runs a task with a timer held open, so an idle event loop does not end the process early.
     * @deprecated Bun clamps the timer to 1 ms, so it holds nothing; the lifecycle trap keeps the loop alive.
     */
    public runWithLock = async <R,>(task: Fn<[], R>): Promise<R> => {
        const lock = setTimeout(() => void 0, Infinity);

        try {
            return await task();
        } finally {
            clearTimeout(lock);
        }
    };

    /**
     * Starts work synchronously and keeps this controller's resources alive until it settles.
     * Task failures reject the returned promise without failing cleanup, and stay unhandled when the caller drops it.
     * A controller that has begun closing throws RuntimeClosedException synchronously, without calling the task.
     * Do not await this controller's or an ancestor's close() from the task, since closure waits for its work.
     * @category runtime
     */
    public track = <R,>(task: Fn<[], Promisify<R>>): Promise<R> => {
        if (this.#state.status !== "open") {
            throw new RuntimeClosedException(this);
        }

        // Closure drains on a later microtask, so registering after the synchronous call is safe.
        const promise = new Promise<R>((resolve) => resolve(task()));
        const settle = () => void this.#pending.delete(pending);
        const pending = promise.then(settle, settle);

        this.#pending.add(pending);

        return promise.then();
    };

    /** Registers the exit-signal handlers, once per controller. */
    public trap = (): this => {
        assert(!this.#disposer.disposed, "trap(): controller already disposed");
        this.signal.throwIfAborted();
        assert(!ExitSignals.some((signal) => process.listeners(signal).includes(this.abort)), "trap(): already called");

        this.#trace.log("trap(%o)", ExitSignals);
        for (const signal of ExitSignals) {
            process.once(signal, this.abort);
            this.#disposer.defer(() => process.removeListener(signal, this.abort));
        }

        const locker = setInterval(() => void 0, 1_000_000_000);
        this.#disposer.defer(() => clearInterval(locker));

        return this;
    };

    /** Starts closure, synchronously aborting the controller and releasing its signal traps. */
    public override abort = (reason?: unknown): this => {
        this.#trace.log("abort(%s)", reason);
        this.close(reason);

        return this;
    };

    /**
     * Registers a resource once by identity and returns it unchanged; a resource another controller owns is refused.
     * After closure begins, queues new resources for cleanup and throws RuntimeClosedException instead.
     * @category runtime
     */
    public own = <T extends Disposable | AsyncDisposable>(resource: T): T => {
        if (!this.#entries.has(resource)) {
            const owner = owners.get(resource);
            assert(
                !owner,
                () => new AssertionException(this.#trace.format("own(%s): owned by %s", identify(resource), owner?.id)),
            );

            const entry = new DisposalEntry(resource);
            owners.set(resource, this);
            this.#entries.set(resource, entry);
            this.#resources.push(entry);

            if (this.#state.status === "closed") {
                this.#startClose();
            }
        }

        if (this.#state.status !== "open") {
            throw new RuntimeClosedException(this);
        }

        return resource;
    };

    /**
     * Disposes one owned resource ahead of closure and returns its single cleanup attempt, which close() and a
     * repeated release share; during closure it returns the attempt in flight. The resource leaves the LIFO queue,
     * so a later close() does not dispose it again.
     * @category runtime
     */
    public release = (resource: Disposable | AsyncDisposable): Promise<void> => {
        const entry = this.#entries.get(resource);
        assert(entry, () => new AssertionException(this.#trace.format("release(%s): not owned", identify(resource))));

        const index = this.#resources.indexOf(entry);
        if (index >= 0) this.#resources.splice(index, 1);

        return entry.dispose();
    };

    /**
     * Registers a cleanup callback in the resource disposal order.
     * After closure begins, queues the callback and throws RuntimeClosedException.
     * @category runtime
     */
    public defer = (cleanup: Fn<[], Promisify<void>>): void => {
        this.own(toAsyncDisposable(cleanup));
    };

    /**
     * Aborts synchronously, waits for tracked work and clone descendants, then disposes owned resources in reverse order.
     * Returns the current batch's promise; new post-close registrations start a fresh batch.
     * Await it outside this controller's work and cleanup callbacks to observe completion and errors.
     * @category runtime
     */
    public close = (reason?: unknown): Promise<void> => {
        return this.#state.status === "open" ? this.#startClose(reason) : this.#state.promise;
    };

    /** Whether the controller holds this child. */
    public has = (child: AbortController): boolean => {
        this.#trace.log("has(%s)", identify(child));

        return this.#children.has(child);
    };

    /**
     * Adds only an abort link, without ownership; aborts the child at once when this controller already has.
     * The link is dropped as soon as the child aborts, whichever side aborts first.
     */
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

        if (child.signal.aborted || this.#children.has(child)) {
            return this;
        }

        const onAbort = () => child.abort();
        this.signal.addEventListener("abort", onAbort, {once: true});
        this.#children.set(child, onAbort);
        child.signal.addEventListener("abort", () => this.detach(child), {once: true});

        return this;
    };

    /** Removes an aborted child's cascade link; clone ownership and pending cleanup remain unchanged. */
    public detach = (child: AbortController) => {
        this.#trace.log("detach(%s)", identify(child));
        assert(child.signal.aborted, this.#trace.format("detach(%s): child is still running", identify(child)));

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

    /** Starts closure synchronously; await close() to observe completion and errors. */
    public [Symbol.dispose](): void {
        this.close();
    }

    #startClose(reason?: unknown): Promise<void> {
        assert(this.#state.status !== "closing", "close(): cleanup is already running");

        const firstClose = this.#state.status === "open";
        const errors: unknown[] = [];
        const promise = Promise.resolve().then(async () => {
            while (this.#pending.size || this.#resources.length) {
                if (this.#pending.size) {
                    await Promise.all(this.#pending);

                    continue;
                }

                const entry = this.#resources.pop()!;

                try {
                    await entry.dispose();
                } catch (error) {
                    errors.push(error);
                }
            }

            this.#state = {status: "closed", promise};

            if (errors.length === 1) throw errors[0];
            if (errors.length > 1) throw new AggregateError(errors, "Runtime cleanup failed");
        });

        this.#state = {status: "closing", promise, errors};

        // Synchronous disposal starts cleanup without awaiting it; retain the original rejection for close().
        void promise.catch(() => undefined);

        if (this.#parent) {
            this.#parent.#joinChild(promise);
        }

        if (firstClose) {
            // Listener failures are reported by the event target, so abort() itself does not throw.
            // Dispatch aborts every linked child, and each one detaches itself.
            super.abort(reason);

            try {
                this.#disposer.dispose();
            } catch (error) {
                errors.push(error);
            }

            this.#trace.log("disposed");
        }

        return promise;
    }

    #joinChild(closing: Promise<void>): void {
        const pending = closing.then(
            () => {
                this.#pending.delete(pending);
            },
            (error) => {
                if (this.#state.status === "closing") {
                    this.#state.errors.push(error);
                }

                this.#pending.delete(pending);
            },
        );

        this.#pending.add(pending);

        if (this.#state.status === "closed") {
            this.#startClose();
        }
    }
}
