import {Unit, runtime, watch} from "../../../src/index.mjs";
import error from "../action/error.mjs";

watch(async function main() {
    runtime.trap();
    await Unit.run(error, {name: "Error"});
});
