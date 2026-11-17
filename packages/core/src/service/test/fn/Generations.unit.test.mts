import {describe, expect, test} from "bun:test";
import {fixture, prelude} from "../../../runtime/test/fixture.mjs";

const fn = JSON.stringify(`${import.meta.dir}/../../fn.mts`);

// A query string makes Bun evaluate fn.mts again with fresh registries while its imports, ServiceRef and the
// registration hooks included, stay cached. The re-evaluated registry takes those hooks over for the whole process,
// so the scenario runs in its own process instead of the runner's. Each observation is emitted as JSON.
const entry = `${prelude}
    import {state} from ${fn};

    const observe = (name, value) => emit(name + " " + JSON.stringify(value));
    const outcome = (pending) => pending.then(() => "resolved", (reason) => String(reason.message));

    class Probe {}
    const ref = service(Probe, () => new Probe());
    const instance = await resolve(ref);

    const next = await import(${fn} + "?generation=1");

    observe("state", next.state(ref));
    observe("unknown", await outcome(next.resolve(Probe)));

    const nextRef = next.service(Probe, () => new Probe());

    observe("fresh", (await next.resolve(Probe)) !== instance);
    observe("original", (await resolve(Probe)) === instance);
    observe("foreign", state(nextRef));
    process.exit(0);
`;

describe("service generations", () => {
    test("a re-evaluated registry should know only its own registrations", async () => {
        await using app = fixture(entry, "plain");

        expect(await app.exited).toEqual({code: 0, signal: null, killed: false});
        expect(app.events()).toEqual([
            `state ${JSON.stringify({known: false, resolved: false})}`,
            expect.stringContaining("Unknown service reference"),
            "fresh true",
            "original true",
            `foreign ${JSON.stringify({known: false, resolved: false})}`,
        ]);
    });
});
