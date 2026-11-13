import {describe, expect, mock, test} from "bun:test";
import {resolve, service, state, sync} from "../../fn.mjs";
import {PendingService} from "../../PendingService.mjs";

// Bun's runner fails the running test on any unhandled rejection, so a test that awaits a tick after
// a factory failure also asserts that no detached promise rejected on the side.
const tick = () => new Promise((done) => setImmediate(done));

describe("service factory", () => {
    class Probe {}

    test("should run the factory once for concurrent resolve calls and hand every caller the same instance", async () => {
        const gate = Promise.withResolvers<Probe>();
        const factory = mock(() => gate.promise);
        const ref = service(Probe, factory);

        const callers = Promise.all([resolve(ref), resolve(ref), resolve(ref)]);
        gate.resolve(new Probe());
        const [first, second, third] = await callers;

        expect(factory).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);
        expect(third).toBe(first);
        expect(await resolve(ref)).toBe(first);
        expect(state(ref)).toEqual({known: true, resolved: true, instance: first});
    });

    test("should share one construction between a thrown PendingService and a concurrent resolve", async () => {
        const gate = Promise.withResolvers<Probe>();
        const factory = mock(() => gate.promise);
        const ref = service(Probe, factory);
        let pending: unknown;

        try {
            sync(ref);
        } catch (reason) {
            pending = reason;
        }

        const resolving = resolve(ref);
        gate.resolve(new Probe());

        expect(pending).toBeInstanceOf(PendingService);
        expect(await (pending as PendingService<Probe>)).toBe(await resolving);
        expect(factory).toHaveBeenCalledTimes(1);
    });

    test("should reject every concurrent caller with the factory failure and leave no promise unhandled", async () => {
        const reason = new Error("factory");
        const gate = Promise.withResolvers<Probe>();
        const factory = mock(() => gate.promise);
        const ref = service(Probe, factory);

        const callers = [resolve(ref), resolve(ref), resolve(ref)];
        const outcomes = Promise.all(callers.map((caller) => caller.catch((error: unknown) => error)));
        gate.reject(reason);
        const settled = await outcomes;
        await tick();

        for (const outcome of settled) {
            expect(outcome).toBe(reason);
        }

        expect(factory).toHaveBeenCalledTimes(1);
        expect(state(ref)).toEqual({known: true, resolved: false});
    });

    test("should observe an eager failure and surface it from a later resolve", async () => {
        const reason = new Error("eager");
        const factories = [
            mock(() => Promise.reject<Probe>(reason)),
            mock((): Probe => {
                throw reason;
            }),
        ];

        for (const factory of factories) {
            const ref = service(Probe, factory, false);
            await tick();

            expect(factory).toHaveBeenCalledTimes(1);
            await expect(resolve(ref)).rejects.toBe(reason);
        }
    });

    test("should observe a rejected promise registration and report it to a later resolve", async () => {
        const reason = new Error("rejected");
        const ref = service(Probe, Promise.reject<Probe>(reason));

        await tick();

        await expect(resolve(ref)).rejects.toBe(reason);
        expect(state(ref)).toEqual({known: true, resolved: false});
    });

    test("should reject with a synchronous factory throw and retry on the next resolve", async () => {
        const reason = new Error("sync");
        const factory = mock((): Probe => {
            throw reason;
        });
        const ref = service(Probe, factory);

        await expect(resolve(ref)).rejects.toBe(reason);
        await expect(resolve(ref)).rejects.toBe(reason);
        await tick();

        expect(factory).toHaveBeenCalledTimes(2);
        expect(state(ref)).toEqual({known: true, resolved: false});
    });

    test("should keep reporting a failure to later callers without retrying the factory", async () => {
        const reason = new Error("factory");
        const factory = mock(() => Promise.reject<Probe>(reason));
        const ref = service(Probe, factory);

        await expect(resolve(ref)).rejects.toBe(reason);
        await expect(resolve(ref)).rejects.toBe(reason);
        await tick();

        expect(factory).toHaveBeenCalledTimes(1);
    });
});
