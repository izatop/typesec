import {describe, expect, test} from "bun:test";
import {fixture, prelude} from "../../../test/fixture.mjs";

// Bun's --watch calls the SIGTERM listeners synchronously and replaces the process image at once, so a restart runs no
// asynchronous cleanup. This pins that contract: if Bun starts letting cleanup finish, these expectations change.
const entry = `${prelude}
    lifecycle.defer(() => emit("cleanup"));
    emit(["ready", process.pid, store.reloadCount, process.listenerCount("SIGTERM")].join(" "));
`;

describe("RuntimeController under bun --watch", () => {
    test("should restart in the same process without the replaced image's cleanup", async () => {
        await using app = fixture(entry, "watch");

        const first = await app.next("ready");
        app.save();
        const second = await app.next("ready");
        app.signal("SIGTERM");

        expect(await app.exited).toEqual({code: null, signal: "SIGTERM", killed: false});
        expect(second).toBe(first);
        expect(first.split(" ").slice(2)).toEqual(["0", "1"]);
        expect(app.events().filter((line) => line === "cleanup")).toHaveLength(1);
    });
});
