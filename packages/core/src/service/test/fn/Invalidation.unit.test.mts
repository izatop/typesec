import {describe, expect, mock, test} from "bun:test";

import {toAsyncDisposable} from "../../../lib/dispostable.mjs";
import {define, resolve, service, state, unload} from "../../fn.mjs";

// Bun's runner fails the running test on an unhandled rejection after a loop turn, so a tick after a dropped result
// also asserts that no detached promise rejected on the side.
const tick = () => new Promise((done) => setImmediate(done));

// Closing the real lifecycle inside the runner would stop every later suite, so those scenarios run in a child process.
// The script counts the disposal hooks `Probe` receives and prints `report` as JSON after a tick.
const observe = (scenario: string): Record<string, unknown> => {
    const script = `
        import {resolve, service, unload} from ${JSON.stringify(`${import.meta.dir}/../../fn.mts`)};
        import {lifecycle} from ${JSON.stringify(`${import.meta.dir}/../../../runtime/controller/index.mts`)};

        const report = {sync: 0};
        const tick = () => new Promise((done) => setImmediate(done));
        class Probe {
            [Symbol.dispose]() {
                report.sync += 1;
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

// A disposable whose hook counts releases, built by a factory that lands when the test resolves `gate`.
const gated = () => {
    const gate = Promise.withResolvers<void>();
    const hook = mock(async () => {});
    const factory = mock(async () => {
        await gate.promise;

        return toAsyncDisposable(hook);
    });

    return {gate, hook, factory};
};

describe("service invalidation", () => {
    test("should hand a result that lands after unload to its callers, release it once and build anew", async () => {
        const {gate, hook, factory} = gated();
        const ref = define("late", factory);

        const stale = resolve(ref);
        const unloading = unload(ref);
        gate.resolve();
        const late = await stale;
        await unloading;

        expect(state(ref)).toEqual({known: true, resolved: false});
        expect(hook).toHaveBeenCalledTimes(1);

        const fresh = await resolve(ref);

        expect(fresh).not.toBe(late);
        expect(factory).toHaveBeenCalledTimes(2);
        expect(hook).toHaveBeenCalledTimes(1);
    });

    test("should drop a late result without a disposal hook and build anew", async () => {
        const gate = Promise.withResolvers<void>();
        const factory = mock(async () => {
            await gate.promise;

            return {};
        });
        const ref = define("plain", factory);

        const stale = resolve(ref);
        const unloading = unload(ref);
        gate.resolve();
        const late = await stale;
        await unloading;

        expect(state(ref)).toEqual({known: true, resolved: false});
        expect(await resolve(ref)).not.toBe(late);
        expect(factory).toHaveBeenCalledTimes(2);
    });

    test("should start the rebuild after the dropped build settles and share it between callers", async () => {
        const {gate, factory} = gated();
        const ref = define("shared", factory);

        const stale = resolve(ref);
        const unloading = unload(ref);
        const callers = Promise.all([resolve(ref), resolve(ref)]);
        await tick();

        expect(factory).toHaveBeenCalledTimes(1);

        gate.resolve();
        const [first, second] = await callers;
        await stale;
        await unloading;

        expect(second).toBe(first);
        expect(factory).toHaveBeenCalledTimes(2);
        expect(state(ref)).toEqual({known: true, resolved: true, instance: first});
    });

    test("should retry a rejected build after unload", async () => {
        const reason = new Error("factory");
        const factory = mock(async () => ({})).mockRejectedValueOnce(reason);
        const ref = define("retry", factory);

        await expect(resolve(ref)).rejects.toBe(reason);
        await expect(resolve(ref)).rejects.toBe(reason);
        await unload(ref);

        expect(await resolve(ref)).toEqual({});
        expect(factory).toHaveBeenCalledTimes(2);
    });

    test("should keep the reason of a build that rejects after unload for its callers and build anew", async () => {
        const reason = new Error("factory");
        const gate = Promise.withResolvers<void>();
        const factory = mock(async () => {
            await gate.promise;

            return {};
        }).mockImplementationOnce(async () => {
            await gate.promise;

            throw reason;
        });
        const ref = define("failing", factory);

        const stale = resolve(ref);
        const unloading = unload(ref);
        gate.resolve();

        await expect(stale).rejects.toBe(reason);
        await expect(unloading).resolves.toBeUndefined();
        expect(await resolve(ref)).toEqual({});
        expect(factory).toHaveBeenCalledTimes(2);
    });

    test("should drop a value from every alias, release it once and refuse to rebuild it", async () => {
        const hook = mock(async () => {});
        const shared = toAsyncDisposable(hook);
        const first = define("first", shared);
        const second = define("second", shared);

        await unload(first);
        await unload(second);

        expect(hook).toHaveBeenCalledTimes(1);
        expect(state(second)).toEqual({known: true, resolved: false});
        await expect(resolve(second)).rejects.toThrow("Service second was unloaded and has no factory");
    });

    test("should let a factory alias reach the rebuilt instance after its source is unloaded", async () => {
        const {gate, hook, factory} = gated();
        const source = define("source", factory);
        const alias = define("alias", () => resolve(source));
        gate.resolve();
        const old = await resolve(alias);

        await unload(source);
        const rebuilt = await resolve(alias);

        expect(rebuilt).not.toBe(old);
        expect(rebuilt).toBe(await resolve(source));
        expect(hook).toHaveBeenCalledTimes(1);
    });

    test("should drop a late result from an alias that already holds it", async () => {
        const {gate, hook, factory} = gated();
        const source = define("source", factory);
        const alias = define("alias", () => resolve(source));

        const built = resolve(alias);
        const unloading = unload(alias);
        gate.resolve();
        const late = await built;
        await unloading;

        expect(await resolve(source)).not.toBe(late);
        expect(hook).toHaveBeenCalledTimes(1);
    });

    test("should publish a pending build of a replaced registration only into its own ref", async () => {
        class Probe {}
        const gate = Promise.withResolvers<Probe>();
        const old = new Probe();
        const previous = service(Probe, () => gate.promise);
        const pending = resolve(previous);
        const current = service(Probe, () => new Probe());

        gate.resolve(old);

        expect(await pending).toBe(old);
        expect(await resolve(previous)).toBe(old);
        expect(await resolve(Probe)).not.toBe(old);
        expect(await resolve(current)).toBe(await resolve(Probe));
    });

    test("should release a replaced registration's instance once when its owner closes", () => {
        const report = observe(`
            const previous = service(Probe, () => new Probe());
            const old = await resolve(previous);
            const current = service(Probe, () => new Probe());
            report.latest = (await resolve(Probe)) === (await resolve(current));
            report.own = (await resolve(previous)) === old;
            await lifecycle.close();
        `);

        expect(report).toEqual({sync: 2, latest: true, own: true});
    });

    test("should release a result that lands after unload once within the owner's close", () => {
        const report = observe(`
            const gate = Promise.withResolvers();
            const ref = service(Probe, async () => {
                await gate.promise;

                return new Probe();
            });
            const stale = resolve(ref).catch(() => undefined);
            const unloading = unload(ref);
            const closing = lifecycle.close();
            gate.resolve();
            await stale;
            await unloading;
            await closing;
        `);

        expect(report).toEqual({sync: 1});
    });

    test("should wait for the release of a result that lands after unload while the owner closes", () => {
        const report = observe(`
            const gate = Promise.withResolvers();
            const disposing = Promise.withResolvers();
            class Slow {
                async [Symbol.asyncDispose]() {
                    report.sync += 1;
                    await disposing.promise;
                }
            }
            const ref = service(Slow, async () => {
                await gate.promise;

                return new Slow();
            });
            const stale = resolve(ref).catch(() => undefined);
            let unloaded = false;
            const unloading = unload(ref).then(() => {
                unloaded = true;
            });
            const closing = lifecycle.close();
            gate.resolve();
            await stale;
            await tick();
            report.beforeRelease = unloaded;
            disposing.resolve();
            await unloading;
            await closing;
        `);

        expect(report).toEqual({sync: 1, beforeRelease: false});
    });

    test("should reject unload with the failed release of a result that lands while the owner closes", () => {
        const report = observe(`
            const gate = Promise.withResolvers();
            class Failing {
                async [Symbol.asyncDispose]() {
                    report.sync += 1;
                    throw new Error("hook");
                }
            }
            const ref = service(Failing, async () => {
                await gate.promise;

                return new Failing();
            });
            const stale = resolve(ref).catch(() => undefined);
            const unloading = unload(ref).then(
                () => "released",
                (reason) => reason.message,
            );
            const closing = lifecycle.close().catch(() => undefined);
            gate.resolve();
            await stale;
            report.unload = await unloading;
            await closing;
        `);

        expect(report).toEqual({sync: 1, unload: "hook"});
    });

    test("should report a late result's failed release once through an unawaited unload", () => {
        const report = observe(`
            class Failing {
                [Symbol.dispose]() {
                    report.sync += 1;
                    throw new Error("hook");
                }
            }
            const gate = Promise.withResolvers();
            const ref = service(Failing, async () => {
                await gate.promise;

                return new Failing();
            });
            process.on("unhandledRejection", () => {
                report.unhandled = (report.unhandled ?? 0) + 1;
            });
            const stale = resolve(ref);
            unload(ref);
            gate.resolve();
            await stale;
            await tick();
        `);

        expect(report).toEqual({sync: 1, unhandled: 1});
    });
});
