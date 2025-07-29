import {task} from "@typesec/the/task";
import {log, warn} from "@typesec/tracer";
import {randomUUIDv7} from "bun";
import {setImmediate} from "node:timers";
import {scheduler} from "node:timers/promises";
import {ExitSignals} from "../../const.mts";
import type {EnvModeType} from "../../env.mts";
import {Ref} from "../../lib/Ref.mts";
import {assert} from "../../lib/assert.mts";

export class RuntimeController extends AbortController {
    public readonly id = randomUUIDv7();

    static readonly #ref = new Ref(() => new this());

    public constructor() {
        super();

        setImmediate(() => {
            const {lifecycle} = RuntimeController;
            if (lifecycle.id !== this.id) {
                lifecycle.enqueue(this);
            }
        });
    }

    public static get lifecycle(): RuntimeController {
        return this.#ref.ensure();
    }

    public static get signal(): AbortSignal {
        return this.lifecycle.signal;
    }

    public static start = (): RuntimeController => {
        this.signal.throwIfAborted();

        if (!process.listeners("SIGINT").includes(this.lifecycle.abort)) {
            log("trap(%o)", ExitSignals);
            for (const signal of ExitSignals) {
                process.once(signal, this.lifecycle.abort);
                this.signal.addEventListener("abort", () => process.removeListener(signal, this.lifecycle.abort), {
                    once: true,
                });
            }
        }

        return this.lifecycle;
    };

    public clone(): RuntimeController {
        return new RuntimeController();
    }

    public trap = (): this => {
        if (this.signal.aborted) {
            warn("trap(): Already aborted");

            return this;
        }

        if (process.listeners("SIGINT").includes(this.abort)) {
            warn("trap(): Trap already set for SIGINT and SIGTERM");

            return this;
        }

        log("listen(%o)", ExitSignals);
        ExitSignals.forEach((fn) => process.once(fn, this.abort));

        return this;
    };

    public isRunning = (): boolean => {
        return !this.signal.aborted;
    };

    public get mode(): EnvModeType | string {
        return process.env["NODE_ENV"] ?? "development";
    }

    public isTest(): boolean {
        return this.mode === "test";
    }

    public isProduction(): boolean {
        return this.mode === "production";
    }

    public isDevelopment(): boolean {
        return this.mode !== "production";
    }

    public only(mode?: EnvModeType, message?: string) {
        assert(mode === this.mode, message ?? `Only available in the ${mode} mode only`);
    }

    public override abort = (reason?: unknown): this => {
        if (this.signal.aborted) {
            warn("abort(): Already aborted");

            return this;
        }

        log("abort()");
        super.abort(reason);

        return this;
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

        this.signal.addEventListener("abort", (reason) => ctrl.abort(reason), {once: true});

        return this;
    };

    public wait = (ms: number): Promise<void> => task.tolerant(scheduler.wait(ms, {signal: this.signal}));
}
