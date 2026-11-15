import {AssertionException} from "@typesec/the/errors";
import {describe, expect, mock, test} from "bun:test";
import {lifecycle, RuntimeController} from "../../../runtime/controller/index.mjs";
import {define, resolve, service, state, unload} from "../../fn.mjs";

// Closing the real lifecycle inside the runner would stop every later suite, so a scenario that closes it runs in a
// child process. The script counts the disposal hooks `Probe` and `AsyncProbe` receive and prints `report` as JSON.
const observe = (scenario: string): Record<string, unknown> => {
    const script = `
        import {define, resolve, service, unload} from ${JSON.stringify(`${import.meta.dir}/../../fn.mts`)};
        import {lifecycle} from ${JSON.stringify(`${import.meta.dir}/../../../runtime/controller/index.mts`)};

        const report = {sync: 0, async: 0};
        const tick = () => new Promise((done) => setImmediate(done));
        class Probe {
            [Symbol.dispose]() {
                report.sync += 1;
            }
        }
        class AsyncProbe extends Probe {
            async [Symbol.asyncDispose]() {
                report.async += 1;
            }
        }

        setTimeout(() => process.exit(1), 1000);
        ${scenario}
        console.log(JSON.stringify(report));
        process.exit(0);
    `;

    const result = Bun.spawnSync({cmd: [process.execPath, "-e", script], stdout: "pipe", stderr: "pipe"});

    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);

    return JSON.parse(result.stdout.toString());
};

describe("service instances", () => {
    test("should dispose a built instance once when its owner closes", () => {
        const report = observe(`
            const ref = service(Probe, () => new Probe());
            await resolve(ref);
            await lifecycle.close();
        `);

        expect(report).toEqual({sync: 1, async: 0});
    });

    test("should dispose a built instance through its async hook only", () => {
        const report = observe(`
            const ref = service(AsyncProbe, () => new AsyncProbe());
            await resolve(ref);
            await lifecycle.close();
        `);

        expect(report).toEqual({sync: 0, async: 1});
    });

    test("should own a value registration at once and dispose it when its owner closes", () => {
        const report = observe(`
            service(Probe, new Probe());
            await lifecycle.close();
        `);

        expect(report).toEqual({sync: 1, async: 0});
    });

    test("should release an unloaded instance once and not again when its owner closes", () => {
        const report = observe(`
            const ref = service(Probe, () => new Probe());
            await resolve(ref);
            unload(ref);
            await tick();
            report.afterUnload = report.sync;
            await lifecycle.close();
        `);

        expect(report).toEqual({sync: 1, async: 0, afterUnload: 1});
    });

    test("should release an unloaded instance through its async hook only", () => {
        const report = observe(`
            const ref = service(AsyncProbe, () => new AsyncProbe());
            await resolve(ref);
            unload(ref);
            await tick();
            report.afterUnload = report.async;
            await lifecycle.close();
        `);

        expect(report).toEqual({sync: 0, async: 1, afterUnload: 1});
    });

    test("should dispose an instance registered under two identities once when its owner closes", () => {
        const report = observe(`
            const shared = new Probe();
            const direct = service(Probe, shared);
            const alias = define("alias", () => shared);
            report.same = (await resolve(alias)) === (await resolve(direct));
            await lifecycle.close();
        `);

        expect(report).toEqual({sync: 1, async: 0, same: true});
    });

    test("should release a shared instance once across the unload of each alias and the owner's close", () => {
        const report = observe(`
            const shared = new Probe();
            const direct = service(Probe, shared);
            const alias = define("alias", () => shared);
            await resolve(alias);
            unload(direct);
            unload(alias);
            await tick();
            report.afterUnload = report.sync;
            await lifecycle.close();
        `);

        expect(report).toEqual({sync: 1, async: 0, afterUnload: 1});
    });

    test("should unload and rebuild an instance that has no disposal hook", async () => {
        const factory = mock(() => ({}));
        const ref = define("plain", factory);
        const first = await resolve(ref);

        unload(ref);

        expect(state(ref)).toEqual({known: true, resolved: false});
        expect(await resolve(ref)).not.toBe(first);
        expect(factory).toHaveBeenCalledTimes(2);
    });

    test("should refuse another controller an instance the lifecycle owns and let the lifecycle re-own it", async () => {
        class Probe {
            public disposed = 0;

            [Symbol.dispose]() {
                this.disposed += 1;
            }
        }
        const other = RuntimeController.clone("other");
        const foreign = new Probe();
        const ref = service(Probe, () => new Probe());
        const probe = await resolve(ref);

        try {
            expect(() => other.own(probe)).toThrow(AssertionException);
            expect(lifecycle.own(probe)).toBe(probe);
            expect(other.own(foreign)).toBe(foreign);
        } finally {
            await other.close();
        }

        expect(probe.disposed).toBe(0);
        expect(foreign.disposed).toBe(1);
    });
});
