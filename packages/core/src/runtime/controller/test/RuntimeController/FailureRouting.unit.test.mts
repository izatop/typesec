import {describe, expect, test} from "bun:test";

const controller = `${import.meta.dir}/../..`;

/** Runs a scenario in a child process, since routing aborts the real lifecycle; it reports escaped failures too. */
const observe = (scenario: string): Record<string, unknown> => {
    const script = `
        import {lifecycle} from ${JSON.stringify(`${controller}/lifecycle.mts`)};

        const report = {escaped: []};
        process.on("unhandledRejection", (reason) => void report.escaped.push(String(reason)));
        process.on("uncaughtException", (error) => void report.escaped.push(String(error)));

        const tick = () => new Promise((done) => setImmediate(done));
        const reason = (generation) => generation.signal.aborted ? String(generation.signal.reason) : "open";

        /** A generation from a re-evaluated controller class, as a hot reload starts it. */
        const generation = async (n) => {
            const next = await import(${JSON.stringify(`${controller}/RuntimeController.mts`)} + "?generation=" + n);

            return next.RuntimeController;
        };

        setTimeout(() => process.exit(9), 2000);
        ${scenario}
        await tick();
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

describe("RuntimeController cleanup failure routing", () => {
    test("should abort the generation current when a replaced root's cleanup fails", () => {
        const report = observe(`
            const gate = Promise.withResolvers();
            const [One, Two] = [await generation(1), await generation(2)];
            lifecycle.defer(() => gate.promise);

            const one = One.start();
            const two = Two.start();
            const closing = lifecycle.close().catch((error) => error.message);
            gate.reject(new Error("late"));

            report.closed = await closing;
            await tick();
            report.one = reason(one);
            report.two = reason(two);
        `);

        expect(report).toEqual({
            escaped: [],
            closed: "late",
            one: "AbortError: The operation was aborted.",
            two: "Error: late",
        });
    });

    test("should abort only once for a batch whose later failure lands after another reload", () => {
        const report = observe(`
            const gates = [Promise.withResolvers(), Promise.withResolvers()];
            const [One, Two] = [await generation(1), await generation(2)];
            lifecycle.defer(() => gates[1].promise);
            lifecycle.defer(() => gates[0].promise);

            const one = One.start();
            const closing = lifecycle.close().catch((error) => error.errors.map(String));
            gates[0].reject(new Error("first"));
            await tick();
            const two = Two.start();
            gates[1].reject(new Error("second"));

            report.closed = await closing;
            await tick();
            report.one = reason(one);
            report.two = reason(two);
        `);

        expect(report).toEqual({
            escaped: [],
            closed: ["Error: first", "Error: second"],
            one: "Error: first",
            two: "open",
        });
    });

    test("should keep the reason of a generation that was already cancelled", () => {
        const report = observe(`
            const gate = Promise.withResolvers();
            const One = await generation(1);
            lifecycle.defer(() => gate.promise);

            const one = One.start();
            one.abort("SIGINT");
            gate.reject(new Error("late"));

            await lifecycle.close().catch(() => undefined);
            await tick();
            report.one = reason(one);
        `);

        expect(report).toEqual({escaped: [], one: "SIGINT"});
    });

    test("should leave the current root open when a child's cleanup fails", () => {
        const report = observe(`
            const child = lifecycle.clone("child");
            child.defer(() => {
                throw new Error("child");
            });

            report.closed = await child.close().catch((error) => error.message);
            await tick();
            report.root = reason(lifecycle);
        `);

        expect(report).toEqual({escaped: [], closed: "child", root: "open"});
    });

    test("should route a failure that a child of the replaced root brings into its cleanup", () => {
        const report = observe(`
            const gate = Promise.withResolvers();
            const One = await generation(1);
            const child = lifecycle.clone("child");
            child.defer(async () => {
                await gate.promise;

                throw new Error("child");
            });

            const one = One.start();
            const closing = lifecycle.close().catch((error) => error.message);
            gate.resolve();

            report.closed = await closing;
            await tick();
            report.one = reason(one);
        `);

        expect(report).toEqual({escaped: [], closed: "child", one: "Error: child"});
    });

    test("should leave the current root open when a root that never started fails", () => {
        const report = observe(`
            const Other = await generation(1);
            const other = Other.lifecycle;
            other.defer(() => {
                throw new Error("orphan");
            });

            report.closed = await other.close().catch((error) => error.message);
            await tick();
            report.root = reason(lifecycle);
        `);

        expect(report).toEqual({escaped: [], closed: "orphan", root: "open"});
    });
});
