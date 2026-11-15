import {describe, expect, test} from "bun:test";
import {resolve, service, state} from "../../fn.mjs";

// A query string makes Bun evaluate fn.mts again with fresh registries; its imports, ServiceRef included, stay cached.
const reload = (): Promise<typeof import("../../fn.mjs")> => import(`../../fn.mjs?generation=${Date.now()}`);

describe("service generations", () => {
    class Probe {}

    test("a re-evaluated registry should know only its own registrations", async () => {
        const ref = service(Probe, () => new Probe());
        const instance = await resolve(ref);

        const next = await reload();

        expect(next.state(ref)).toEqual({known: false, resolved: false});
        await expect(next.resolve(Probe)).rejects.toThrow("Unknown service reference");

        const nextRef = next.service(Probe, () => new Probe());

        expect(await next.resolve(Probe)).not.toBe(instance);
        expect(await resolve(Probe)).toBe(instance);
        expect(state(nextRef)).toEqual({known: false, resolved: false});
    });
});
