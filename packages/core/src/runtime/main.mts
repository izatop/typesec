import {identify} from "@typesec/the/object";
import {get} from "radash";
import {tracer} from "../tracer.mjs";
import {dispose} from "./dispose.mjs";
import {exit} from "./exit.mjs";
import type {MainTask} from "./interfaces.mjs";
import {run} from "./run.mjs";
import {lifecycle} from "./runtime.mjs";

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
