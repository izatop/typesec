import {describe, expect, test} from "bun:test";

import {fixture, prelude} from "../fixture.mjs";

const entry = (factory: string) => `${prelude}
    process.on("unhandledRejection", (reason) => emit("unhandled " + reason));
    service(class Db {}, ${factory}, false);

    void main(() => void emit("task"));
`;

describe("main warmup", () => {
    test("should run the task once the eager builds have finished", async () => {
        await using app = fixture(
            entry(`async () => {
                await new Promise((done) => setTimeout(done, 30));
                emit("built");

                return {};
            }`),
            "plain",
        );

        expect(await app.exited).toEqual({code: 0, signal: null, killed: false});
        expect(app.events()).toEqual(["built", "task"]);
    });

    test("should exit with 1 without calling the task when an eager build fails", async () => {
        await using app = fixture(entry(`async () => Promise.reject(new Error("boom"))`), "plain");

        expect(await app.exited).toEqual({code: 1, signal: null, killed: false});
        expect(app.events()).toEqual([]);
    });

    test("should exit with 0 without calling the task when a signal ends the warmup", async () => {
        await using app = fixture(
            entry(`async () => {
                emit("building");
                await runtime.heartbeat();

                return {};
            }`),
            "plain",
        );

        await app.next("building");
        app.signal("SIGTERM");

        expect(await app.exited).toEqual({code: 0, signal: null, killed: false});
        expect(app.events()).toEqual(["building"]);
    });
});
