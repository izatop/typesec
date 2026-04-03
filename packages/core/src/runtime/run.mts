import {identify} from "@typesec/the/object";
import {tracer} from "../tracer.mjs";
import type {RuntimeController} from "./controller/RuntimeController.mjs";
import {type Task} from "./interfaces.mjs";
import {runtime} from "./runtime.mjs";

export async function run<R>(task: Task<R>, withContext?: RuntimeController): Promise<Awaited<R>> {
    tracer.log("run( <%s> ): *", identify(task));
    using pending = runtime.run(task, withContext);

    return await pending;
}
