import {describe, expect, test} from "bun:test";

const controller = `${import.meta.dir}/../..`;

/** Runs a reload scenario in a child process, since a reload aborts the real lifecycle. */
const observe = (scenario: string): Record<string, unknown> => {
    const script = `
        import {lifecycle} from ${JSON.stringify(`${controller}/lifecycle.mts`)};

        const report = {};
        const tick = () => new Promise((done) => setImmediate(done));

        /** A generation from a re-evaluated controller class, as a hot reload starts it. */
        const generation = async (n) => {
            const next = await import(${JSON.stringify(`${controller}/RuntimeController.mts`)} + "?generation=" + n);

            return next.RuntimeController;
        };

        setTimeout(() => process.exit(9), 2000);
        ${scenario}
        console.log(JSON.stringify(report));
        process.exit(0);
    `;

    const child = Bun.spawnSync({cmd: [process.execPath, "-e", script], stdout: "pipe", stderr: "pipe", timeout: 5000});

    expect({code: child.exitCode, stderr: child.exitCode === 0 ? "" : child.stderr.toString()}).toEqual({
        code: 0,
        stderr: "",
    });

    return JSON.parse(child.stdout.toString());
};

describe("ReloadController publication", () => {
    test("should publish the new generation before the old one starts stopping", () => {
        const report = observe(`
            const Next = await generation(1);
            lifecycle.signal.addEventListener("abort", () => {
                const current = globalThis.ReloadController.lifecycle;
                report.seen = current === lifecycle ? "old" : "new";
                report.count = globalThis.ReloadController.reloadCount;
                report.open = !current.signal.aborted;
            });

            const next = Next.start();
            report.current = globalThis.ReloadController.lifecycle === next;
        `);

        expect(report).toEqual({seen: "new", count: 1, open: true, current: true});
    });

    test("should keep only the latest of fast reloads current while older cleanups are unfinished", () => {
        const report = observe(`
            const gates = [Promise.withResolvers(), Promise.withResolvers()];
            const [One, Two] = [await generation(1), await generation(2)];
            const closed = [];
            lifecycle.defer(() => gates[0].promise);

            const one = One.start();
            one.defer(() => gates[1].promise);
            const two = Two.start();
            const zero = lifecycle.close().then(() => void closed.push(0));
            const first = one.close().then(() => void closed.push(1));

            await tick();
            report.pending = [...closed];
            gates[1].resolve();
            gates[0].resolve();
            await Promise.all([zero, first]);

            report.closed = closed.sort();
            report.current = globalThis.ReloadController.lifecycle === two && !two.signal.aborted;
            report.count = globalThis.ReloadController.reloadCount;
        `);

        expect(report).toEqual({pending: [], closed: [0, 1], current: true, count: 2});
    });
});
