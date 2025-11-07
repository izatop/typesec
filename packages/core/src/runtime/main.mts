import {identify} from "@typesec/the/object";
import {get} from "radash";
import {tracer} from "../tracer.mts";
import {dispose} from "./dispose.mts";
import {exit} from "./exit.mts";
import type {MainTask} from "./interfaces.mts";
import {run} from "./run.mts";
import {lifecycle} from "./runtime.mts";

export async function main(task: MainTask): Promise<Timer> {
    const name = get(task, "meta.name") ?? identify(task);
    try {
        tracer.info("await %s()", name);
        const result = await run(task, lifecycle);
        await dispose(result);

        return exit(0);
    } catch (reason) {
        tracer.error(reason);

        return exit(1, reason);
    }
}
