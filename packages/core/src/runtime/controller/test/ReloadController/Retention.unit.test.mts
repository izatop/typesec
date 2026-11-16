import {describe, expect, test} from "bun:test";
import {fixture, prelude} from "../../../test/fixture.mjs";

const controller = `${import.meta.dir}/../..`;

// Generation 0 keeps weak references to its controller modules; generation 1 reports which of them the collector could
// not free. The parent saves the entry, so no closure of generation 0 outlives the reload.
const entry = `${prelude}
    import * as reload from ${JSON.stringify(`${controller}/ReloadController.mts`)};
    import * as hmr from ${JSON.stringify(`${controller}/hmr.mts`)};
    import * as controller from ${JSON.stringify(`${controller}/RuntimeController.mts`)};

    if (generation === 0) {
        globalThis.refs = {
            lifecycle: new WeakRef(lifecycle),
            reload: new WeakRef(reload),
            hmr: new WeakRef(hmr),
            controller: new WeakRef(controller),
        };

        emit("ready");
    } else {
        for (let i = 0; i < 10; i++) {
            Bun.gc(true);
            await new Promise((done) => setTimeout(done, 10));
        }

        const alive = Object.entries(globalThis.refs).filter(([, ref]) => ref.deref() !== undefined);
        emit("alive " + JSON.stringify(alive.map(([name]) => name)));
        process.exit(0);
    }
`;

describe("ReloadController retention", () => {
    test("should let the collector free the replaced generation's controller modules", async () => {
        await using app = fixture(entry, "hot");

        await app.next("ready");
        app.save();

        expect(await app.exited).toEqual({code: 0, signal: null, killed: false});
        expect(app.events("alive")).toEqual(["[]"]);
    });
});
