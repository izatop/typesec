import {identify} from "@typesec/the/object";
import {tracer} from "../tracer.mts";
import type {RuntimeController} from "./controller/RuntimeController.mts";
import {type Task} from "./interfaces.mjs";
import {runtime} from "./runtime.mts";

export async function run<R>(task: Task<R>, withContext?: RuntimeController): Promise<Awaited<R>> {
    tracer.log("run( <%s> ): *", identify(task));
    using pending = runtime.run(task, withContext);

    return await pending;
}
