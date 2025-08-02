import {identify} from "@typesec/the/object";
import {wrap} from "@typesec/tracer";
import type {RuntimeController} from "./controller/RuntimeController.mts";
import {type Task} from "./interfaces.mjs";
import {runtime} from "./runtime.mts";

const tracer = wrap("run(task)");

export async function run<R>(task: Task<R>, withContext?: RuntimeController): Promise<Awaited<R>> {
    try {
        tracer.info("run( <%s> )", identify(task));
        using pending = runtime.run(task, withContext);

        return await pending;
    } catch (reason) {
        tracer.error(reason);

        throw reason;
    } finally {
        tracer.log("release");
    }
}
