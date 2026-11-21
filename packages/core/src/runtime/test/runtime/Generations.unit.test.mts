import {describe, expect, test} from "bun:test";

import {lifecycle, RuntimeController} from "../../controller/index.mjs";
import {runtime} from "../../runtime.mjs";

type RuntimeModule = {runtime: typeof runtime};

// A query string makes Bun evaluate the module again with fresh module state, as a hot reload does.
const reload = (): Promise<RuntimeModule> => import(`${import.meta.dir}/../../runtime.mts?generation=${Date.now()}`);

describe("runtime generations", () => {
    test("old work should keep its controller when it reaches a re-evaluated runtime module", async () => {
        const owner = RuntimeController.clone("old");
        const {promise: reloaded, resolve: publish} = Promise.withResolvers<RuntimeModule>();

        const observed = runtime.run(async () => (await reloaded).runtime.use(), owner);

        try {
            const next = await reload();

            expect(next.runtime).not.toBe(runtime);
            expect(next.runtime.use()).toBe(lifecycle);

            publish(next);

            expect(await observed).toBe(owner);
        } finally {
            await owner.close();
        }
    });
});
