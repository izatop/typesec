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
});
