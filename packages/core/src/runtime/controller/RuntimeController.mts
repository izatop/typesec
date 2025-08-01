import {assert} from "@typesec/the/assert";
import {task} from "@typesec/the/task";
import type {Fn} from "@typesec/the/type";
import {type Tracer, wrap} from "@typesec/tracer";
import {scheduler} from "node:timers/promises";
import {ExitSignals} from "../../const.mts";
import type {EnvModeType} from "../../env.mts";
import {Ref} from "../../lib/Ref.mts";
import {heartbeat} from "../heartbeat.mts";
import {RuntimeSequence} from "./RuntimeSequence.mts";

export class RuntimeController extends AbortController implements Disposable {
    public readonly id: string;

    readonly #trace: Tracer;
    readonly #parent: RuntimeController | null;
    readonly #children = new Set<AbortController>();

    static readonly #ref = new Ref(() => new this(null, "lifecycle"));

    private constructor(parent?: RuntimeController | null, id?: string) {
        super();
        id = id ?? `runtime(${RuntimeSequence.increment(RuntimeController)})`;
        this.#trace = wrap(`${id}`);
        this.id = id;
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
        this.lifecycle.#trace.log("?.start(): %s", this.lifecycle.id);
        this.signal.throwIfAborted();

        return this.lifecycle.trap();
    };

    public static clone = (id?: string): RuntimeController => {
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

    public only = (mode?: EnvModeType, message?: string) => {
        assert(!mode || mode === this.mode, message ?? `Only available in the ${mode} mode only`);
    };

    public trap = (): this => {
        if (ExitSignals.some((signal) => process.listeners(signal).includes(this.abort))) {
            this.#trace.warn("?.trap(): has been already registered");
        }

        if (!ExitSignals.some((signal) => process.listeners(signal).includes(this.abort))) {
            /**
             * @TODO Think about how to prevent event-loop blocking during tests.
             */
            if (!this.isTest()) {
                this.#trace.log("?.trap(%o)", ExitSignals);
                for (const signal of ExitSignals) {
                    process.once(signal, this.abort);
                }
            } else {
                this.#trace.log("?.trap(): skips in testing environment");
            }

            this.signal.addEventListener("abort", () => this[Symbol.dispose](), {once: true});
        }

        return this;
    };

    public override abort = (reason?: unknown): this => {
        if (this.signal.aborted) {
            this.#trace.warn("?.abort(): Already aborted");

            return this;
        }

        this.#trace.log("?.abort(%o)", this.isLifecycle() ? "lifecycle" : "runtime", reason);
        super.abort(reason);
        this.#parent?.detach(this);
        ExitSignals.forEach((signal) => process.off(signal, this.abort));

        return this;
    };

    public has = (ctrl: AbortController): boolean => {
        return this.#children.has(ctrl);
    };

    public enqueue = (ctrl: AbortController, throwIfAborted = false): this => {
        if (throwIfAborted) {
            assert(!this.signal.aborted, "Parent instance has already aborted");
            assert(!ctrl.signal.aborted, "Child instance has already aborted");
        }

        if (this.signal.aborted) {
            ctrl.abort("Parent instance has already aborted");

            return this;
        }

        this.signal.addEventListener("abort", ctrl.abort, {once: true});
        this.#children.add(ctrl);

        return this;
    };

    public detach = (ctrl: AbortController) => {
        this.signal.removeEventListener("abort", ctrl.abort);
        this.#children.delete(ctrl);
    };

    public wait = (ms: number): Promise<void> => {
        return task.tolerant(scheduler.wait(ms, {signal: this.signal}));
    };

    public async [Symbol.dispose](): Promise<void> {
        if (!this.signal.aborted) {
            this.abort("Disposed");
        }
    }
}

export default RuntimeController.start();
