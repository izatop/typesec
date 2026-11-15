import {describe, expect, test} from "bun:test";

const root = `${import.meta.dir}/../..`;

/** Runs a `main` scenario in a child process, recording `process.exit` calls instead of exiting. */
const observe = (scenario: string): Record<string, unknown> => {
    const script = `
        import {main} from ${JSON.stringify(`${root}/main.mts`)};
        import {runtime} from ${JSON.stringify(`${root}/runtime.mts`)};
        import {resolve, service} from ${JSON.stringify(`${root}/../service/fn.mts`)};

        const report = {events: [], exits: []};
        const realExit = process.exit.bind(process);
        process.exit = (code) => void report.exits.push(code);
        setTimeout(() => realExit(9), 2000);

        const tick = () => new Promise((done) => setImmediate(done));
        const started = Promise.withResolvers();
        class Db {
            closed = false;
            async [Symbol.asyncDispose]() {
                this.closed = true;
                await tick();
                report.events.push("db closed");
            }
        }

        const db = service(Db, () => new Db());
        const result = (db, name = "result") => ({
            async [Symbol.asyncDispose]() {
                report.events.push(name + " start: db " + (db.closed ? "closed" : "open"));
                await tick();
                report.events.push(name + " end: db " + (db.closed ? "closed" : "open"));
            },
        });

        ${scenario}
        await tick();
        await tick();
        console.log(JSON.stringify(report));
        realExit(0);
    `;

    const child = Bun.spawnSync({cmd: [process.execPath, "-e", script], stdout: "pipe", stderr: "pipe", timeout: 5000});

    expect({code: child.exitCode, stderr: child.exitCode === 0 ? "" : child.stderr.toString()}).toEqual({
        code: 0,
        stderr: "",
    });

    return JSON.parse(child.stdout.toString());
};

describe("main result", () => {
    test("should release the result before the services it uses when the lifecycle is closed from outside", () => {
        const report = observe(`
            const running = main(async () => {
                const instance = await resolve(db);
                started.resolve();
                await runtime.heartbeat();

                return result(instance);
            });

            await started.promise;
            process.kill(process.pid, "SIGTERM");
            await running;
        `);

        expect(report).toEqual({
            events: ["result start: db open", "result end: db open", "db closed"],
            exits: [0],
        });
    });

    test("should release a late result once, before the services, when the task ignores the abort", () => {
        const report = observe(`
            const gate = Promise.withResolvers();
            const running = main(async () => {
                const instance = await resolve(db);
                started.resolve();
                await gate.promise;

                return result(instance);
            });

            await started.promise;
            const aborted = new Promise((done) => runtime.signal.addEventListener("abort", done, {once: true}));
            process.kill(process.pid, "SIGTERM");
            await aborted;
            gate.resolve();
            await running;
        `);

        expect(report).toEqual({
            events: ["result start: db open", "result end: db open", "db closed"],
            exits: [0],
        });
    });

    test("should release a returned service instance only once", () => {
        const report = observe(`
            let disposed = 0;
            class Server {
                [Symbol.dispose]() {
                    disposed += 1;
                }
            }
            const server = service(Server, () => new Server());
            await main(() => resolve(server));
            report.disposed = disposed;
        `);

        expect(report).toEqual({events: [], exits: [0], disposed: 1});
    });
});

describe("main after a reload", () => {
    /** Starts generation 1 from a re-evaluated controller class, which aborts generation 0 as a hot reload does. */
    const reload = `
        const next = await import(${JSON.stringify(`${root}/controller/RuntimeController.mts?generation=1`)});
        const current = next.RuntimeController.start();
    `;

    test("should not exit for the new generation when a replaced main completes", () => {
        const report = observe(`
            const running = main(async () => {
                const instance = await resolve(db);
                started.resolve();
                await runtime.heartbeat();

                return result(instance);
            });

            await started.promise;
            ${reload}
            report.resolved = (await running) ?? "undefined";
            report.currentOpen = !current.signal.aborted;
        `);

        expect(report).toEqual({
            events: ["result start: db open", "result end: db open", "db closed"],
            exits: [],
            resolved: "undefined",
            currentOpen: true,
        });
    });

    test("should still exit with 1 when a replaced main fails", () => {
        const report = observe(`
            const running = main(async () => {
                started.resolve();
                await runtime.heartbeat();

                throw new Error("stale failure");
            });

            await started.promise;
            ${reload}
            await running;
        `);

        expect(report).toEqual({events: [], exits: [1]});
    });
});
