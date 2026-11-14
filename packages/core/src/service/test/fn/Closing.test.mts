import {describe, expect, test} from "bun:test";

// Every scenario closes the real lifecycle, which inside the runner would stop every later suite, so each one runs in
// a child process. The script counts the factory calls and the disposal hooks `Probe` and `AsyncProbe` receive, folds
// a resolve through `outcome` into `built`, `closed` or the failure text, and prints `report` as JSON. Bun reports an
// unhandled rejection only after a loop turn, so the script ticks before exiting.
const observe = (scenario: string): Record<string, unknown> => {
    const script = `
        import {resolve, service, state} from ${JSON.stringify(`${import.meta.dir}/../../fn.mts`)};
        import {lifecycle, RuntimeClosedException} from ${JSON.stringify(`${import.meta.dir}/../../../runtime/controller/index.mts`)};

        const report = {sync: 0, async: 0, factory: 0};
        const tick = () => new Promise((done) => setImmediate(done));
        const outcome = (pending) =>
            pending.then(
                () => "built",
                (reason) => (reason instanceof RuntimeClosedException ? "closed" : String(reason)),
            );

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
        // A gated factory lets the scenario choose when its result lands relative to close().
        const gate = Promise.withResolvers();
        const gated = (build) => async () => {
            report.factory += 1;
            await gate.promise;

            return build();
        };

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

describe("service closing", () => {
    test("should release a disposable result that lands after close began and keep the entry unavailable", () => {
        const report = observe(`
            const ref = service(Probe, gated(() => new Probe()));
            const callers = [resolve(ref), resolve(ref)];
            const closing = lifecycle.close();
            gate.resolve();
            report.callers = await Promise.all(callers.map(outcome));
            await closing;
            report.disposedAtClose = report.sync;
            report.later = await outcome(resolve(ref));
            report.state = state(ref);
        `);

        expect(report).toEqual({
            sync: 1,
            async: 0,
            factory: 1,
            callers: ["closed", "closed"],
            disposedAtClose: 1,
            later: "closed",
            state: {known: true, resolved: false},
        });
    });

    test("should not publish a late result that has no disposal hook", () => {
        const report = observe(`
            const ref = service(class Plain {}, gated(() => ({})));
            const resolving = resolve(ref);
            const closing = lifecycle.close();
            gate.resolve();
            report.first = await outcome(resolving);
            await closing;
            report.later = await outcome(resolve(ref));
            report.state = state(ref);
        `);

        expect(report).toEqual({
            sync: 0,
            async: 0,
            factory: 1,
            first: "closed",
            later: "closed",
            state: {known: true, resolved: false},
        });
    });

    test("should report the factory's own failure after close began and leave no promise unhandled", () => {
        const report = observe(`
            const ref = service(Probe, gated(() => Promise.reject(new Error("factory"))));
            const resolving = resolve(ref);
            const closing = lifecycle.close();
            gate.resolve();
            report.first = await outcome(resolving);
            await closing;
            report.later = await outcome(resolve(ref));
            report.state = state(ref);
        `);

        expect(report).toEqual({
            sync: 0,
            async: 0,
            factory: 1,
            first: "Error: factory",
            later: "Error: factory",
            state: {known: true, resolved: false},
        });
    });

    test("should release a late result through its async hook only", () => {
        const report = observe(`
            const ref = service(AsyncProbe, gated(() => new AsyncProbe()));
            const resolving = resolve(ref);
            const closing = lifecycle.close();
            gate.resolve();
            report.first = await outcome(resolving);
            await closing;
        `);

        expect(report).toEqual({sync: 0, async: 1, factory: 1, first: "closed"});
    });

    test("should release an eager factory's late result once and keep its kick-off observed", () => {
        const report = observe(`
            const ref = service(Probe, gated(() => new Probe()), false);
            const closing = lifecycle.close();
            gate.resolve();
            await closing;
            report.disposedAtClose = report.sync;
            report.later = await outcome(resolve(ref));
            report.state = state(ref);
        `);

        expect(report).toEqual({
            sync: 1,
            async: 0,
            factory: 1,
            disposedAtClose: 1,
            later: "closed",
            state: {known: true, resolved: false},
        });
    });

    test("should refuse a registration once the owner closed, leaving no entry and the value to the caller", () => {
        const report = observe(`
            await lifecycle.close();
            class Value extends Probe {}
            class Plain {}
            class Lazy extends Probe {}
            const attempts = {
                value: () => service(Value, new Value()),
                plain: () => service(Plain, {}),
                lazy: () => service(Lazy, () => new Lazy()),
            };

            for (const [kind, attempt] of Object.entries(attempts)) {
                try {
                    attempt();
                    report[kind] = "registered";
                } catch (reason) {
                    report[kind] = reason instanceof RuntimeClosedException ? "closed" : String(reason);
                }
            }

            report.known = [Value, Plain, Lazy].map((ctor) => {
                try {
                    return state(ctor).known;
                } catch {
                    return "unknown";
                }
            });
        `);

        expect(report).toEqual({
            sync: 0,
            async: 0,
            factory: 0,
            value: "closed",
            plain: "closed",
            lazy: "closed",
            known: ["unknown", "unknown", "unknown"],
        });
    });
});
