import {describe, expect, test} from "bun:test";
import {fixture, prelude} from "../../../runtime/test/fixture.mjs";

// An eager service whose factory, in the first two generations, finishes only once a save has replaced its
// generation; every generation reports what became of its build.
const entry = `${prelude}
    class Db {
        [Symbol.dispose]() {
            emit("released " + generation);
        }
    }

    service(Db, async () => {
        emit("building " + generation);
        if (generation < 2) {
            await new Promise((done) => lifecycle.signal.addEventListener("abort", done, {once: true}));
        }

        return new Db();
    }, false);

    resolve(Db).then(() => emit("published " + generation), () => emit("refused " + generation));
`;

describe("service under bun --hot", () => {
    test("should release builds that a save interrupts once and publish only the current generation's", async () => {
        await using app = fixture(entry, "hot");

        await app.next("building 0");
        app.save();
        await app.next("building 1");
        app.save();
        await app.next("published 2");
        app.signal("SIGTERM");

        expect(await app.exited).toEqual({code: null, signal: "SIGTERM", killed: false});
        expect(app.events("published")).toEqual(["2"]);
        expect(app.events("refused").toSorted()).toEqual(["0", "1"]);
        expect(app.events("released").toSorted()).toEqual(["0", "1", "2"]);
    });
});
