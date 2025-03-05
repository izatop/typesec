import {info} from "@typesec/tracer";
import {Unit, heartbeat, runtime, watch} from "../../../src/index.mjs";
import avg from "../action/avg.mjs";

const immediate = watch(async function main() {
    runtime.trap();

    const abort = new AbortController();
    const unit = new Unit({});

    const call = async () => {
        const values = Array.from({length: 100}, () => Math.random());
        const result = await unit.run(avg, {values});
        info("Avg of 100 times random values: %o", {result});
    };

    call();

    using interval = setInterval(call, 1000);
    using timeout = setTimeout(() => abort.abort(), 2000);

    await heartbeat(abort);

    return {
        async [Symbol.asyncDispose]() {
            info("dispose");
        },
    };
});

immediate.then(clearImmediate);
