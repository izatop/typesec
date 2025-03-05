import {MainFunction} from "./interfaces.mjs";
import {runtime} from "./runtime.mjs";
import {watch} from "./watch.mjs";

export async function run(main: MainFunction): Promise<NodeJS.Immediate> {
    runtime.trap();

    return watch(main);
}
