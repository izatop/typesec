import {describe, expect, test} from "bun:test";
import {mkdtempSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const controller = `${import.meta.dir}/../..`;

// Generation 0 keeps nothing of its own alive: its timers are built with `new Function`, so no closure of its module
// survives the reload, and generation 1 reports which of its modules the collector could not free.
const entry = `
    import {lifecycle} from ${JSON.stringify(`${controller}/lifecycle.mts`)};
    import * as reload from ${JSON.stringify(`${controller}/ReloadController.mts`)};
    import * as hmr from ${JSON.stringify(`${controller}/hmr.mts`)};
    import * as runtime from ${JSON.stringify(`${controller}/RuntimeController.mts`)};

    const global = globalThis;
    global.generation = (global.generation ?? -1) + 1;
    global.fallback ??= setTimeout(new Function("process.exit(9)"), 3000);

    if (global.generation === 0) {
        global.refs = {
            lifecycle: new WeakRef(lifecycle),
            reload: new WeakRef(reload),
            hmr: new WeakRef(hmr),
            runtime: new WeakRef(runtime),
        };
        global.entry = import.meta.path;
        setTimeout(new Function("process.getBuiltinModule('node:fs').appendFileSync(globalThis.entry, '\\\\n')"), 50);
    } else {
        setTimeout(async () => {
            for (let i = 0; i < 10; i++) {
                Bun.gc(true);
                await new Promise((done) => setTimeout(done, 10));
            }

            const alive = Object.entries(global.refs).filter(([, ref]) => ref.deref() !== undefined).map(([name]) => name);
            console.log(JSON.stringify({generation: global.generation, alive}));
            process.exit(0);
        }, 20);
    }
`;

describe("ReloadController retention", () => {
    test("should let the collector free the replaced generation's controller modules", async () => {
        const dir = mkdtempSync(join(tmpdir(), "typesec-retention-"));
        const file = join(dir, "entry.mts");
        writeFileSync(file, entry);

        try {
            const child = Bun.spawn({cmd: [process.execPath, "--hot", file], stdout: "pipe", stderr: "pipe"});
            const timer = setTimeout(() => child.kill(9), 4000);
            const [stdout, code] = await Promise.all([new Response(child.stdout).text(), child.exited]).finally(() =>
                clearTimeout(timer),
            );

            expect({code, report: JSON.parse(stdout.trim().split("\n").at(-1) ?? "null")}).toEqual({
                code: 0,
                report: {generation: 1, alive: []},
            });
        } finally {
            rmSync(dir, {recursive: true, force: true});
        }
    });
});
