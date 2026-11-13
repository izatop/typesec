import {identify} from "@typesec/the/object";
import {tracer} from "../tracer.mjs";
import type {RuntimeController} from "./controller/RuntimeController.mjs";
import {type Task} from "./interfaces.mjs";
import {runtime} from "./runtime.mjs";

/**
 * Runs a task through `runtime.run` with a trace: the current controller is borrowed, an explicit one is owned and closed.
 * @category runtime
 */
export function run<R>(task: Task<R>, withContext?: RuntimeController): Promise<R> {
    tracer.log("run( <%s> ): *", identify(task));

    return runtime.run(task, withContext);
}
