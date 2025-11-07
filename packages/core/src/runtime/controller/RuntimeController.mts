import {assert} from "@typesec/the/assert";
import {identify} from "@typesec/the/object";
import {task} from "@typesec/the/task";
import type {Fn} from "@typesec/the/type";
import {type Tracer, wrap} from "@typesec/tracer";
import {scheduler} from "node:timers/promises";
import {ExitSignals} from "../../const.mts";
import type {EnvModeType} from "../../env.mts";
import {withDisposablePending, type WithDisposablePending} from "../../lib/dispostable.mts";
import {Ref} from "../../lib/Ref.mts";
import {dispose} from "../dispose.mts";
import {heartbeat} from "../heartbeat.mts";
import {RuntimeSequence} from "./RuntimeSequence.mts";

export class RuntimeController extends AbortController implements Disposable {
    public readonly id: string;

    readonly #trace: Tracer;
    readonly #parent: RuntimeController | null;
    readonly #children = new Map<AbortController, EventListener>();

    static readonly #ref = new Ref(() => new this(null, "lifecycle"));

    private constructor(parent?: RuntimeController | null, id?: string) {
        super();
        this.id = id ?? RuntimeSequence.increment(RuntimeController).toString();
        this.#trace = wrap(`[runtime] ${id}`);
        this.#parent = parent ?? null;
        this.#parent?.enqueue(this);
    }

    public static get lifecycle(): RuntimeController {
        return this.#ref.ensure();
    }

    public static get signal(): AbortSignal {
        return this.lifecycle.signal;
    }

    public static start = (): RuntimeController => {
        this.lifecycle.#trace.log("start()");
        this.signal.throwIfAborted();

        return this.lifecycle.trap();
    };

    public static clone = (id?: string): RuntimeController => {
        this.lifecycle.#trace.log("clone(%s)", id);

        return this.lifecycle.clone(id);
    };

    public clone = (id?: string): RuntimeController => {
        return new RuntimeController(this, id);
    };

    public isLifecycle = (): boolean => {
        return this === RuntimeController.lifecycle;
    };

    public isRunning = (): boolean => {
        return !this.signal.aborted;
    };

    public get mode(): EnvModeType | string {
        return process.env["NODE_ENV"] ?? "development";
    }

    public isTest = (): boolean => {
        return this.mode === "test";
    };

    public heartbeat = <R = void,>(dispose?: Fn<[], R>): Promise<R> => {
        return heartbeat(this).then(dispose);
    };

    public isProduction = (): boolean => {
        return this.mode === "production";
    };

    public isDevelopment = (): boolean => {
        return this.mode !== "production";
    };

    public only = (mode?: EnvModeType, message?: string): void => {
        assert(!mode || mode === this.mode, message ?? `Only available in the ${mode} mode only`);
    };

    public run = <R,>(task: Fn<[], R>, lock = true): WithDisposablePending<R> => {
        return withDisposablePending(lock ? this.runWithLock(task) : task(), () => dispose(this));
    };

    public runWithLock = async <R,>(task: Fn<[], R>): Promise<R> => {
        const lock = setTimeout(() => void 0, Infinity);

        try {
            return await task();
        } finally {
            clearTimeout(lock);
        }
    };

    public trap = (): this => {
        if (ExitSignals.some((signal) => process.listeners(signal).includes(this.abort))) {
            this.#trace.warn("trap(): already registered");
        } else {
            const locker = setInterval(() => void 0, 1_000_000_000);
            this.#trace.log("trap(%o)", ExitSignals);
            for (const signal of ExitSignals) {
                process.once(signal, this.abort);
            }

            this.signal.addEventListener("abort", () => dispose(this), {once: true});
            this.signal.addEventListener("abort", () => clearInterval(locker));
        }

        return this;
    };

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

    public has = (child: AbortController): boolean => {
        this.#trace.log("has(%s)", identify(child));
        return this.#children.has(child);
    };

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

        const onAbort = () => child.abort();
        this.signal.addEventListener("abort", child.abort, {once: true});
        this.#children.set(child, onAbort);

        return this;
    };

    public detach = (child: AbortController) => {
        this.#trace.log("detach(%s)", identify(child));
        const onAbort = this.#children.get(child);
        if (onAbort) {
            this.signal.removeEventListener("abort", onAbort);
        }

        this.#children.delete(child);
    };

    public wait = (ms: number): Promise<void> => {
        return task.tolerant(scheduler.wait(ms, {signal: this.signal}));
    };

    public async [Symbol.dispose](): Promise<void> {
        if (!this.signal.aborted && !this.isTest()) {
            this.abort("Disposed");
        } else {
            for (const child of this.#children.keys()) {
                this.detach(child);
            }
        }

        this.#children.clear();
    }
}

export default RuntimeController.start();
