import {describe, expect, test} from "bun:test";
import {fixture, prelude} from "../fixture.mjs";

const entry = `${prelude}
    void main(async () => {
        emit("running " + generation);
        await runtime.heartbeat();
    }).then((timer) => emit("ended " + generation + " " + (timer === undefined ? "replaced" : "exiting")));
`;

describe("main under bun --hot", () => {
    test("should leave the process to the new generation's main after a save", async () => {
        await using app = fixture(entry, "hot");

        await app.next("running 0");
        app.save();
        await app.next("running 1");

        expect(await app.next("ended 0")).toBe("ended 0 replaced");

        app.signal("SIGTERM");

        expect(await app.exited).toEqual({code: 0, signal: null, killed: false});
        expect(app.events().at(-1)).toBe("ended 1 exiting");
    });

    test("should end a main whose warmup a save interrupts as replaced, without calling its task", async () => {
        // Generation 0's eager build waits for a latch that only generation 1's task opens, so the new warmup cannot
        // wait for the retired build, and the retired main must not take that refused build for its own failure.
        await using app = fixture(
            `${prelude}
            globalThis.latch ??= Promise.withResolvers();
            service(class Db {}, async () => {
                emit("building " + generation);
                if (generation === 0) await globalThis.latch.promise;

                return {};
            }, false);

            void main(async () => {
                emit("task " + generation);
                globalThis.latch.resolve();
                await runtime.heartbeat();
            }).then((timer) => emit("ended " + generation + " " + (timer === undefined ? "replaced" : "exiting")));
        `,
            "hot",
        );

        await app.next("building 0");
        app.save();
        await app.next("task 1");

        expect(await app.next("ended 0")).toBe("ended 0 replaced");

        app.signal("SIGTERM");

        expect(await app.exited).toEqual({code: 0, signal: null, killed: false});
        expect(app.events("task")).toEqual(["1"]);
    });
});
