import {describe, expect, test} from "bun:test";

import {store} from "../../hmr.mjs";

type HmrModule = {store: typeof store};

// A query string makes Bun evaluate the module again with fresh module state, as a hot reload does.
const reload = (): Promise<HmrModule> => import(`${import.meta.dir}/../../hmr.mts?generation=${Date.now()}`);

describe("hmr", () => {
    test("should adopt the store of an earlier generation", async () => {
        const next = await reload();

        expect(next.store).toBe(store);
    });
});
