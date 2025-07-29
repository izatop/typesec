import {type MainFunction} from "./interfaces.mjs";
import {watch} from "./watch.mjs";

export async function run(main: MainFunction): Promise<Timer> {
    return watch(main);
}
