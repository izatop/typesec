import {describe, expect, test} from "bun:test";
import {mkdtempSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const runtime = `${import.meta.dir}/../../..`;

type Outcome = {code: number | null; signal: NodeJS.Signals | number | null; events: string[]};

/**
 * Runs an entry in a real Bun process, sends it one signal once it prints `@@ready`, and reports how it ended. The
 * entry has no fallback timer of its own, so a process that does not exit by itself is killed here and shows SIGKILL.
 */
const run = async (entry: string, signal: "SIGINT" | "SIGTERM", hot = false): Promise<Outcome> => {
    const dir = mkdtempSync(join(tmpdir(), "typesec-termination-"));
    const file = join(dir, "entry.mts");
    writeFileSync(file, entry);

    try {
        const child = Bun.spawn({
            cmd: [process.execPath, ...(hot ? ["--hot"] : []), file],
            stdout: "pipe",
            stderr: "pipe",
        });

        const fallback = setTimeout(() => child.kill(9), 3000);
        const events: string[] = [];
        const decoder = new TextDecoder();
        let buffer = "";

        try {
            for await (const chunk of child.stdout) {
                buffer += decoder.decode(chunk);
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines.filter((text) => text.startsWith("@@"))) {
                    events.push(line.slice(2));
                    if (line === "@@ready") child.kill(signal);
                }
            }

            await child.exited;
        } finally {
            clearTimeout(fallback);
        }

        return {code: child.exitCode, signal: child.signalCode, events};
    } finally {
        rmSync(dir, {recursive: true, force: true});
    }
};

const imports = `
    import {lifecycle} from ${JSON.stringify(`${runtime}/controller/lifecycle.mts`)};
    import {store} from ${JSON.stringify(`${runtime}/controller/hmr.mts`)};
    import {main} from ${JSON.stringify(`${runtime}/main.mts`)};
    import {runtime} from ${JSON.stringify(`${runtime}/runtime.mts`)};

    const emit = (event) => console.log("@@" + event);
`;

describe("RuntimeController termination", () => {
    for (const hot of [false, true]) {
        test(`should end a process without main after one signal, with the signal's own code${hot ? " under --hot" : ""}`, async () => {
            const outcome = await run(
                `${imports}
                lifecycle.defer(() => emit("cleanup"));
                emit("ready");
            `,
                "SIGINT",
                hot,
            );

            expect(outcome).toEqual({code: null, signal: "SIGINT", events: ["ready", "cleanup"]});
        });
    }

    test("should keep main's exit code after one signal", async () => {
        const outcome = await run(
            `${imports}
            void main(async () => {
                emit("ready");
                await runtime.heartbeat();
            });
        `,
            "SIGTERM",
        );

        expect(outcome).toEqual({code: 0, signal: null, events: ["ready"]});
    });

    // Generation 0 reloads itself; its cleanup then waits for the current generation's shutdown, so it is still pending
    // when the signal arrives and can only finish afterwards, 10 ms after the current cleanup has started. The rewrite
    // runs from a timer built with `new Function`, so no closure of generation 0 outlives the reload.
    const retired = (ending: string) => `${imports}
        globalThis.generation = (globalThis.generation ?? -1) + 1;
        if (globalThis.generation === 0) {
            const current = () => store.lifecycle;
            lifecycle.defer(async () => {
                emit("old start");
                await new Promise((done) => current().signal.addEventListener("abort", done, {once: true}));
                await new Promise((done) => setTimeout(done, 10));
                ${ending}
            });
            globalThis.entry = import.meta.path;
            setTimeout(new Function("process.getBuiltinModule('node:fs').appendFileSync(globalThis.entry, '\\\\n')"), 20);
        } else {
            lifecycle.defer(() => emit("current cleanup"));
            emit("ready");
        }
    `;

    test("should wait for a replaced generation's pending cleanup before the process ends", async () => {
        const outcome = await run(retired(`emit("old end");`), "SIGTERM", true);

        expect(outcome).toEqual({
            code: null,
            signal: "SIGTERM",
            events: ["ready", "old start", "current cleanup", "old end"],
        });
    });

    test("should exit with 1 when a replaced generation's cleanup fails during shutdown", async () => {
        const outcome = await run(retired(`throw new Error("old cleanup failed");`), "SIGTERM", true);

        expect(outcome).toEqual({code: 1, signal: null, events: ["ready", "old start", "current cleanup"]});
    });

    test("should exit with 1 when the oldest of several replaced generations fails during shutdown", async () => {
        const outcome = await run(
            `${imports}
            globalThis.generation = (globalThis.generation ?? -1) + 1;
            globalThis.entry = import.meta.path;
            const reload = new Function("process.getBuiltinModule('node:fs').appendFileSync(globalThis.entry, '\\\\n')");
            if (globalThis.generation === 0) {
                const current = () => store.lifecycle;
                lifecycle.defer(async () => {
                    // Waits through every reload for the shutdown of whichever generation is current last.
                    while (!current().signal.aborted) {
                        await new Promise((done) => current().signal.addEventListener("abort", done, {once: true}));
                    }

                    throw new Error("oldest cleanup failed");
                });
                setTimeout(reload, 20);
            } else if (globalThis.generation === 1) {
                setTimeout(reload, 20);
            } else {
                emit("ready");
            }
        `,
            "SIGTERM",
            true,
        );

        expect(outcome).toEqual({code: 1, signal: null, events: ["ready"]});
    });
});
