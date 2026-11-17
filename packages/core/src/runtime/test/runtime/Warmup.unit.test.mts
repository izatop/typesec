import {describe, expect, test} from "bun:test";
import {fixture, prelude} from "../fixture.mjs";

// Each scenario runs in its own process: a failed eager build stays until `unload`, so it would reject the
// top-level runs of every later suite. An unhandled rejection is reported as an event, after a loop turn.
const scenario = (body: string) => `${prelude}
    process.on("unhandledRejection", (reason) => emit("unhandled " + reason));
    const later = (ms, value) => new Promise((done) => setTimeout(() => done(value), ms));
    const build = (name, ms, value = {}) => async () => {
        await later(ms);
        emit("built " + name);

        return value;
    };

    ${body}

    await later(10);
    process.exit(0);
`;

describe("runtime.run warmup", () => {
    test("should start a top-level task only after the root's eager builds, leaving lazy and child services alone", async () => {
        await using app = fixture(
            scenario(`
                service(class Slow {}, build("slow", 30), false);
                service(class Quick {}, build("value", 10), false);
                service(class Lazy {}, build("lazy", 0));
                lifecycle.clone("child").service(class Child {}, async () => Promise.reject(new Error("child")), false);

                await runtime.run(() => emit("task"));
            `),
            "plain",
        );

        expect(await app.exited).toEqual({code: 0, signal: null, killed: false});
        expect(app.events()).toEqual(["built value", "built slow", "task"]);
    });

    test("should reject with the first failure in registration order, without the task, until unload", async () => {
        await using app = fixture(
            scenario(`
                const late = new Error("late");
                const early = new Error("early");
                const Late = service(class Late {}, async () => Promise.reject(await later(30, late)), false);
                service(class Early {}, async () => Promise.reject(await later(10, early)), false);
                const attempt = () =>
                    runtime.run(() => emit("task")).then(
                        () => emit("resolved"),
                        (reason) => emit("rejected " + (reason === late ? "late" : reason === early ? "early" : reason)),
                    );

                await attempt();
                await attempt();
                await unload(Late);
                await attempt();
            `),
            "plain",
        );

        expect(await app.exited).toEqual({code: 0, signal: null, killed: false});
        expect(app.events()).toEqual(["rejected late", "rejected late", "rejected early"]);
    });

    test("should refuse the task when its controller begins closing during the warmup", async () => {
        await using app = fixture(
            scenario(`
                service(class Slow {}, build("slow", 30), false);
                const child = lifecycle.clone("child");
                const running = runtime.run(() => emit("task"), child).then(
                    () => emit("resolved"),
                    (reason) => emit("rejected " + reason.constructor.name),
                );

                child.abort();
                await running;
            `),
            "plain",
        );

        expect(await app.exited).toEqual({code: 0, signal: null, killed: false});
        expect(app.events()).toEqual(["built slow", "rejected RuntimeClosedException"]);
    });

    test("should not warm up a run nested in a factory or a task", async () => {
        await using app = fixture(
            scenario(`
                service(class Self {}, async () => {
                    await later(10);
                    emit("factory " + (await runtime.run(() => "nested")));

                    return {};
                }, false);

                await runtime.run(async () => {
                    const gate = Promise.withResolvers();
                    service(class Inner {}, () => gate.promise, false);
                    emit("task " + (await runtime.run(() => "nested")));
                    gate.resolve({});
                });
            `),
            "plain",
        );

        expect(await app.exited).toEqual({code: 0, signal: null, killed: false});
        expect(app.events()).toEqual(["factory nested", "task nested"]);
    });
});
