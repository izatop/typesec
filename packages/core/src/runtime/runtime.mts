import {log, warn} from "@typesec/tracer";
import assert from "node:assert";
import timers from "node:timers/promises";

const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

class Runtime extends AbortController {
    public isRunning = (): boolean => {
        return !this.signal.aborted;
    };

    public isProduction(): boolean {
        return process.env["NODE_ENV"] === "production";
    }

    public isDevelopment(): boolean {
        return process.env["NODE_ENV"] !== "production";
    }

    public trap = () => {
        if (this.signal.aborted) {
            warn("trap(): Already aborted");

            return;
        }

        if (process.listeners("SIGINT").includes(this.abort)) {
            warn("trap(): Trap already set for SIGINT and SIGTERM");

            return;
        }

        log("listen(%o)", signals);
        signals.forEach((s) => process.once(s, this.abort));
    };

    public abort = () => {
        if (this.signal.aborted) {
            warn("abort(): Already aborted");

            return;
        }

        log("abort()");
        super.abort();
    };

    public enqueue = (ctrl: AbortController) => {
        assert(!this.signal.aborted || !ctrl.signal.aborted, "Already aborted");

        this.signal.addEventListener("abort", () => ctrl.abort(), {once: true});
    };

    public wait = (timer: number): Promise<void> => {
        return timers.setTimeout(timer, void 0, {signal: this.signal});
    };
}

export const runtime = new Runtime();
