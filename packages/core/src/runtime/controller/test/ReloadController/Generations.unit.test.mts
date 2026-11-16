import {describe, expect, test} from "bun:test";
import {fixture, prelude} from "../../../test/fixture.mjs";

// Every generation registers a service and a cleanup, and reports its revision and signal listeners when ready.
const entry = (revision = 0) => `${prelude}
    class Db {
        [Symbol.dispose]() {
            emit("released " + generation);
        }
    }

    service(Db, () => (emit("built " + generation), new Db()));
    await resolve(Db);
    lifecycle.defer(() => emit("cleanup " + generation));
    emit(["ready", generation, ${revision}, process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")].join(" "));
`;

describe("ReloadController generations under bun --hot", () => {
    test("should start one generation per save and release each one's resources once", async () => {
        await using app = fixture(entry(), "hot");

        await app.next("ready");
        for (let save = 0; save < 3; save++) {
            app.save();
            await app.next("ready");
        }

        app.signal("SIGTERM");

        expect(await app.exited).toEqual({code: null, signal: "SIGTERM", killed: false});
        expect(app.events("ready")).toEqual(["0 0 1 1", "1 0 1 1", "2 0 1 1", "3 0 1 1"]);
        expect(app.events("built")).toEqual(["0", "1", "2", "3"]);
        expect(app.events("released").toSorted()).toEqual(["0", "1", "2", "3"]);
        expect(app.events("cleanup").toSorted()).toEqual(["0", "1", "2", "3"]);
    });

    test("should keep the generation through a broken save and replace it after a failing one", async () => {
        await using app = fixture(entry(), "hot");

        await app.next("ready 0");
        app.save("syntax error (");
        // After a broken save Bun sometimes waits about a second before it loads the next one.
        await app.failure("Unexpected end of file");
        app.save(`${prelude}
            lifecycle.defer(() => emit("cleanup " + generation));
            emit("failing " + generation);
            throw new Error("failing save");
        `);

        const failing = await app.next("failing");
        app.save(entry(1));
        const ready = await app.next("ready");
        app.signal("SIGTERM");

        expect(await app.exited).toEqual({code: null, signal: "SIGTERM", killed: false});
        expect([failing, ready]).toEqual(["failing 1", "ready 2 1 1 1"]);
        expect(app.events("cleanup").toSorted()).toEqual(["0", "1", "2"]);
        expect(app.events("released").toSorted()).toEqual(["0", "2"]);
    });

    test("should end on the last revision of saves Bun coalesces, releasing every generation once", async () => {
        await using app = fixture(entry(), "hot");

        await app.next("ready");
        for (let revision = 1; revision <= 5; revision++) app.save(entry(revision));

        // Bun may load several saves at once, so only the last revision is awaited.
        while ((await app.next("ready")).split(" ")[2] !== "5");

        app.signal("SIGTERM");

        expect(await app.exited).toEqual({code: null, signal: "SIGTERM", killed: false});
        expect(app.events("ready").every((line) => line.endsWith(" 1 1"))).toBeTrue();
        expect(app.events("released").toSorted()).toEqual(app.events("built").toSorted());
    });
});
