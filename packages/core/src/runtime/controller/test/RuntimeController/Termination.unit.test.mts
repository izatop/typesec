import {describe, expect, test} from "bun:test";
import {fixture, prelude, type Fixture} from "../../../test/fixture.mjs";

/** Waits until the process has ended and reports how, with the events it printed. */
const ended = async (app: Fixture) => ({...(await app.exited), events: app.events()});

/**
 * An entry whose generation 0 has a cleanup that waits for the shutdown of whichever generation is current last, so it
 * is still pending when the signal arrives, and then runs `ending`; later generations defer `cleanup <n>`. Every
 * generation prints `ready <n>`.
 */
const retired = (ending: string) => `${prelude}
    if (generation === 0) {
        lifecycle.defer(async () => {
            emit("old start");
            while (!store.lifecycle.signal.aborted) {
                await new Promise((done) => store.lifecycle.signal.addEventListener("abort", done, {once: true}));
            }

            await new Promise((done) => setTimeout(done, 10));
            ${ending}
        });
    } else {
        lifecycle.defer(() => emit("cleanup " + generation));
    }

    emit("ready " + generation);
`;

describe("RuntimeController termination", () => {
    for (const mode of ["plain", "hot"] as const) {
        test(`should end a process without main after one signal, with the signal's own code (${mode})`, async () => {
            await using app = fixture(`${prelude} lifecycle.defer(() => emit("cleanup")); emit("ready");`, mode);

            await app.next("ready");
            app.signal("SIGINT");

            expect(await ended(app)).toEqual({
                code: null,
                signal: "SIGINT",
                killed: false,
                events: ["ready", "cleanup"],
            });
        });
    }

    test("should keep main's exit code after one signal", async () => {
        await using app = fixture(`${prelude} void main(async () => (emit("ready"), runtime.heartbeat()));`, "plain");

        await app.next("ready");
        app.signal("SIGTERM");

        expect(await ended(app)).toEqual({code: 0, signal: null, killed: false, events: ["ready"]});
    });

    test("should end a bun test run after one signal", async () => {
        await using app = fixture(
            `${prelude}
            import {test} from "bun:test";

            test("waits for the lifecycle", async () => {
                emit("ready");
                await runtime.heartbeat();
                emit("resumed");
            });
        `,
            "test",
        );

        await app.next("ready");
        app.signal("SIGINT");

        expect(await ended(app)).toEqual({code: null, signal: "SIGINT", killed: false, events: ["ready", "resumed"]});
    });

    test("should wait for a replaced generation's pending cleanup before the process ends", async () => {
        await using app = fixture(retired(`emit("old end");`), "hot");

        await app.next("ready 0");
        app.save();
        await app.next("ready 1");
        app.signal("SIGTERM");

        expect(await ended(app)).toEqual({
            code: null,
            signal: "SIGTERM",
            killed: false,
            events: ["ready 0", "ready 1", "old start", "cleanup 1", "old end"],
        });
    });

    test("should exit with 1 when a replaced generation's cleanup fails during shutdown", async () => {
        await using app = fixture(retired(`throw new Error("old cleanup failed");`), "hot");

        await app.next("ready 0");
        app.save();
        await app.next("ready 1");
        app.signal("SIGTERM");

        expect(await ended(app)).toEqual({
            code: 1,
            signal: null,
            killed: false,
            events: ["ready 0", "ready 1", "old start", "cleanup 1"],
        });
    });

    test("should exit with 1 when the oldest of several replaced generations fails during shutdown", async () => {
        await using app = fixture(retired(`throw new Error("oldest cleanup failed");`), "hot");

        await app.next("ready 0");
        app.save();
        await app.next("ready 1");
        app.save();
        await app.next("ready 2");
        app.signal("SIGTERM");

        expect(await ended(app)).toMatchObject({code: 1, signal: null, killed: false});
    });

    test("should exit with 1 when a replaced generation's cleanup fails on a save", async () => {
        await using app = fixture(
            `${prelude}
            lifecycle.defer(() => {
                emit("cleanup " + generation);
                if (generation === 0) throw new Error("old cleanup failed");
            });

            emit("ready " + generation);
        `,
            "hot",
        );

        await app.next("ready 0");
        app.save();

        expect(await ended(app)).toEqual({
            code: 1,
            signal: null,
            killed: false,
            events: ["ready 0", "ready 1", "cleanup 0", "cleanup 1"],
        });
    });
});
