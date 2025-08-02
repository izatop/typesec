import {wrap} from "@typesec/tracer";
import {dispose} from "./dispose.mts";
import {exit} from "./exit.mts";
import type {MainTask} from "./interfaces.mts";
import {run} from "./run.mts";
import {lifecycle} from "./runtime.mts";

const tracer = wrap("main(task)");

export async function main(task: MainTask): Promise<Timer> {
    try {
        tracer.info("enter()");
        const result = await run(task, lifecycle);
        await dispose(result);

        return exit(0);
    } catch (reason) {
        return exit(1, reason);
    } finally {
        tracer.log("release");
    }
}
