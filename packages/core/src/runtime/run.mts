import {identify} from "@typesec/the/object";
import {tracer} from "../tracer.mjs";
import type {RuntimeController} from "./controller/RuntimeController.mjs";
import {type Task} from "./interfaces.mjs";
import {runtime} from "./runtime.mjs";

/**
 * Runs a task inside a runtime controller, defaulting to the current one, and disposes the context afterwards.
 * @category runtime
 */
export async function run<R>(task: Task<R>, withContext?: RuntimeController): Promise<Awaited<R>> {
    tracer.log("run( <%s> ): *", identify(task));
    using pending = runtime.run(task, withContext);

    return await pending;
}
