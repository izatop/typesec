import {describe, expect, mock, test} from "bun:test";

import {toAsyncDisposable, toDisposable} from "../../../lib/dispostable.mjs";
import {define, resolve, state, unload} from "../../fn.mjs";

// Bun's runner fails the running test on any unhandled rejection, so a test that awaits a tick after a release
// failure also asserts that no detached promise rejected on the side.
const tick = () => new Promise((done) => setImmediate(done));

// Closing the real lifecycle inside the runner would stop every later suite, so a scenario that closes it runs in a
// child process. The script counts the disposal hooks `Probe` receives; its async hook reports through `started`
// when it began and finishes once the scenario opens `gate`. The script prints `report` as JSON after a tick, so an
// unhandled rejection still reaches stderr.
const observe = (scenario: string): Record<string, unknown> => {
    const script = `
        import {resolve, service, unload} from ${JSON.stringify(`${import.meta.dir}/../../fn.mts`)};
        import {lifecycle} from ${JSON.stringify(`${import.meta.dir}/../../../runtime/controller/index.mts`)};

        const report = {sync: 0, async: 0};
        const tick = () => new Promise((done) => setImmediate(done));
        const gate = Promise.withResolvers();
        const started = Promise.withResolvers();
        class Probe {
            [Symbol.dispose]() {
                report.sync += 1;
            }
            async [Symbol.asyncDispose]() {
                report.async += 1;
                started.resolve();
                await gate.promise;
            }
        }

        setTimeout(() => process.exit(1), 1000);
        ${scenario}
        await tick();
        console.log(JSON.stringify(report));
        process.exit(0);
    `;

    const result = Bun.spawnSync({cmd: [process.execPath, "-e", script], stdout: "pipe", stderr: "pipe"});

    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);

    return JSON.parse(result.stdout.toString());
};

describe("service unload", () => {
    // A release the test controls: the hook reports when it started and finishes once the test opens the gate.
    const gated = () => {
        const gate = Promise.withResolvers<void>();
        const started = Promise.withResolvers<void>();
        const hook = mock(async () => {
            started.resolve();
            await gate.promise;
        });

        return {gate, started, hook};
    };

    test("should resolve once the async hook has run and leave the entry unresolved", async () => {
        const {gate, started, hook} = gated();
        const settled = mock(() => void 0);
        const ref = define("gated", () => toAsyncDisposable(hook));
        await resolve(ref);

        const releasing = unload(ref);
        void releasing.then(settled);
        await started.promise;
        await tick();

        expect(settled).not.toHaveBeenCalled();
        expect(state(ref)).toEqual({known: true, resolved: false});

        gate.resolve();
        await releasing;

        expect(settled).toHaveBeenCalledTimes(1);
        expect(hook).toHaveBeenCalledTimes(1);
        expect(state(ref)).toEqual({known: true, resolved: false});
    });

    test("should reject the caller with an async hook failure, release once and rebuild on the next resolve", async () => {
        const reason = new Error("async hook");
        const hook = mock(() => Promise.reject(reason));
        const factory = mock(() => toAsyncDisposable(hook));
        const ref = define("failing", factory);
        const first = await resolve(ref);

        await expect(unload(ref)).rejects.toBe(reason);
        await tick();

        expect(hook).toHaveBeenCalledTimes(1);
        expect(state(ref)).toEqual({known: true, resolved: false});

        await expect(unload(ref)).resolves.toBeUndefined();
        const second = await resolve(ref);

        expect(second).not.toBe(first);
        expect(factory).toHaveBeenCalledTimes(2);
    });

    test("should reject the caller with a sync hook failure instead of leaving it unhandled", async () => {
        const reason = new Error("sync hook");
        const hook = mock((): void => {
            throw reason;
        });
        const ref = define("throwing", () => toDisposable(hook));
        await resolve(ref);

        await expect(unload(ref)).rejects.toBe(reason);
        await tick();

        expect(hook).toHaveBeenCalledTimes(1);
        expect(state(ref)).toEqual({known: true, resolved: false});
    });

    test("should let a resolve during an unfinished unload wait for the release and then rebuild", async () => {
        const gate = Promise.withResolvers<void>();
        const started = Promise.withResolvers<void>();
        const events: string[] = [];
        const factory = mock(() => {
            events.push("factory");

            return toAsyncDisposable(async () => {
                events.push("dispose");
                started.resolve();
                await gate.promise;
            });
        });
        const ref = define("rebuilt", factory);
        const first = await resolve(ref);

        const releasing = unload(ref);
        const rebuilding = resolve(ref);
        await started.promise;
        await tick();

        expect(factory).toHaveBeenCalledTimes(1);
        expect(events).toEqual(["factory", "dispose"]);
        expect(state(ref)).toEqual({known: true, resolved: false});

        gate.resolve();
        await releasing;
        const second = await rebuilding;

        expect(second).not.toBe(first);
        expect(factory).toHaveBeenCalledTimes(2);
        expect(events).toEqual(["factory", "dispose", "factory"]);
        expect(state(ref)).toEqual({known: true, resolved: true, instance: second});
    });

    test("should share one release between concurrent unload calls", async () => {
        const {gate, hook} = gated();
        const settled = mock(() => void 0);
        const ref = define("shared", () => toAsyncDisposable(hook));
        await resolve(ref);

        const first = unload(ref);
        const second = unload(ref);
        void second.then(settled);
        await tick();

        expect(settled).not.toHaveBeenCalled();

        gate.resolve();
        await Promise.all([first, second]);

        expect(settled).toHaveBeenCalledTimes(1);
        expect(hook).toHaveBeenCalledTimes(1);
    });

    test("should resolve at once when there is nothing to release", async () => {
        const factory = mock(() => ({}));
        const unbuilt = define("unbuilt", factory);
        const plain = define("plain", factory);
        await resolve(plain);

        await expect(unload(unbuilt)).resolves.toBeUndefined();
        await expect(unload(plain)).resolves.toBeUndefined();

        expect(factory).toHaveBeenCalledTimes(1);
        expect(state(unbuilt)).toEqual({known: true, resolved: false});
        expect(state(plain)).toEqual({known: true, resolved: false});
    });

    test("should run one cleanup when unload and the owner's close start in the same tick", () => {
        const report = observe(`
            const ref = service(Probe, () => new Probe());
            await resolve(ref);
            const releasing = unload(ref);
            const closing = lifecycle.close().then(() => {
                report.closed = true;
            });

            await started.promise;
            await tick();
            report.closedBeforeRelease = report.closed === true;
            gate.resolve();
            await Promise.all([releasing, closing]);
        `);

        expect(report).toEqual({sync: 0, async: 1, closedBeforeRelease: false, closed: true});
    });

    test("should keep the release in the owner's batch when unload follows close in the same tick", () => {
        const report = observe(`
            const ref = service(Probe, () => new Probe());
            await resolve(ref);
            const closing = lifecycle.close().then(() => {
                report.closed = true;
            });

            const releasing = unload(ref);
            await started.promise;
            await tick();
            report.closedBeforeRelease = report.closed === true;
            gate.resolve();
            await Promise.all([releasing, closing]);
        `);

        expect(report).toEqual({sync: 0, async: 1, closedBeforeRelease: false, closed: true});
    });
});
