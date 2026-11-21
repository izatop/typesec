import {describe, expect, test} from "bun:test";

import {lifecycle, RuntimeClosedException, RuntimeController} from "../../../runtime/controller/index.mjs";
import {runtime} from "../../../runtime/runtime.mjs";
import {resolve, service, state, unload} from "../../fn.mjs";

class Probe {
    readonly controller = runtime.use();
    readonly signal = runtime.signal;
    disposed = 0;

    constructor(
        readonly name = "probe",
        readonly order: string[] = [],
    ) {}

    [Symbol.dispose]() {
        this.disposed += 1;
        this.order.push(this.name);
    }
}

describe("global service under a child", () => {
    test("should keep a service registered inside a child run alive after the child closes", async () => {
        const child = RuntimeController.clone("child");

        const ref = await child.run(() => service(Probe, () => new Probe()));
        const built = await child.run(() => resolve(ref));
        await child.close();
        const again = await resolve(ref);

        expect(child.signal.aborted).toBeTrue();
        expect(built.controller).toBe(lifecycle);
        expect(built.disposed).toBe(0);
        expect(again).toBe(built);
        expect(state(ref)).toEqual({known: true, instance: built, resolved: true});
    });

    test("should keep a root service alive after a child run owns and closes its controller", async () => {
        const ref = service(Probe, () => new Probe());
        const child = RuntimeController.clone("child");

        const used = await runtime.run(() => resolve(ref), child);
        const after = await resolve(ref);

        expect(child.signal.aborted).toBeTrue();
        expect(used.disposed).toBe(0);
        expect(after).toBe(used);
        expect(lifecycle.isRunning()).toBeTrue();
    });

    test("should resolve the class lookup to the root registration made inside a child run", async () => {
        const child = RuntimeController.clone("child");

        const ref = await runtime.run(() => service(Probe, () => new Probe()), child);
        const byClass = await resolve(Probe);

        expect(byClass).toBe(await resolve(ref));
        expect(byClass.disposed).toBe(0);
    });
});

describe("controller.service", () => {
    test("should give sibling controllers separate entries of one class through exact refs", async () => {
        const left = RuntimeController.clone("left");
        const right = RuntimeController.clone("right");
        const leftRef = left.service(Probe, () => new Probe("left"));
        const rightRef = right.service(Probe, () => new Probe("right"));

        const [l, r] = await resolve(leftRef, rightRef);

        expect(l).not.toBe(r);
        expect(l.controller).toBe(left);
        expect(r.controller).toBe(right);

        await left.close();

        expect(l.disposed).toBe(1);
        expect(r.disposed).toBe(0);
        expect(await resolve(rightRef)).toBe(r);

        await right.close();

        expect(r.disposed).toBe(1);
    });

    test("should release only the child's services on child close, last built first", async () => {
        const order: string[] = [];
        const rootRef = service(Probe, () => new Probe("root", order));
        const child = RuntimeController.clone("child");
        const firstRef = child.service(Probe, () => new Probe("first", order));
        const secondRef = child.service(Probe, () => new Probe("second", order));

        const root = await resolve(rootRef);
        await resolve(firstRef);
        await resolve(secondRef);
        await child.close();

        expect(order).toEqual(["second", "first"]);
        expect(root.disposed).toBe(0);
        expect(await resolve(rootRef)).toBe(root);
    });

    test("should own value and eager registrations on the child", async () => {
        const child = RuntimeController.clone("child");
        const value = new Probe("value");
        child.service(Probe, value);
        const eagerRef = child.service(Probe, () => new Probe("eager"), false);

        const eager = await resolve(eagerRef);
        await child.close();

        expect(eager.controller).toBe(child);
        expect(value.disposed).toBe(1);
        expect(eager.disposed).toBe(1);
    });

    test("should keep a root service resolved by a child service alive after the child run ends", async () => {
        const rootRef = service(Probe, () => new Probe("root"));
        const child = RuntimeController.clone("child");
        const childRef = child.service(Probe, async () => {
            await resolve(rootRef);

            return new Probe("child");
        });

        const used = await runtime.run(() => resolve(childRef), child);
        const root = await resolve(rootRef);

        expect(used.disposed).toBe(1);
        expect(root.disposed).toBe(0);
        expect(root.controller).toBe(lifecycle);
    });

    test("should run a child factory under the child, whoever resolves it", async () => {
        const child = RuntimeController.clone("child");
        const ref = child.service(Probe, () => new Probe());

        const probe = await resolve(ref);

        expect(probe.controller).toBe(child);
        expect(probe.signal).toBe(child.signal);

        await child.close();
    });

    test("should abort a pending child factory's signal when the child closes", async () => {
        const child = RuntimeController.clone("child");
        const gate = Promise.withResolvers<void>();
        let seen: AbortSignal | undefined;
        const ref = child.service(Probe, async () => {
            seen = runtime.signal;
            await gate.promise;

            return new Probe();
        });

        const resolving = resolve(ref).catch((reason) => reason);
        const closing = child.close("stopped");
        gate.resolve();
        const outcome = await resolving;
        await closing;

        expect(outcome).toBeInstanceOf(RuntimeClosedException);
        expect(seen).toBe(child.signal);
        expect(seen?.aborted).toBeTrue();
    });

    test("should refuse registration on a closing or closed child", async () => {
        const closing = RuntimeController.clone("closing");
        const closed = RuntimeController.clone("closed");
        await closed.close();

        const pending = closing.close();

        expect(() => closing.service(Probe, () => new Probe())).toThrow(RuntimeClosedException);
        expect(() => closed.service(Probe, () => new Probe())).toThrow(RuntimeClosedException);

        await pending;
    });

    test("should keep the class lookup on the root registration when a child registers the class", async () => {
        const rootRef = service(Probe, () => new Probe("root"));
        const child = RuntimeController.clone("child");
        child.service(Probe, () => new Probe("child"));

        const byClass = await resolve(Probe);

        expect(byClass).toBe(await resolve(rootRef));

        await child.close();

        expect((await resolve(Probe)).disposed).toBe(0);
    });

    test("should refuse a child factory that returns a root-owned instance", async () => {
        const rootRef = service(Probe, () => new Probe("root"));
        const child = RuntimeController.clone("child");
        const aliasRef = child.service(Probe, () => resolve(rootRef));

        const root = await resolve(rootRef);
        const outcome = await resolve(aliasRef).then(
            () => "built",
            (reason) => String(reason),
        );
        await child.close();

        expect(outcome).toContain("owned by lifecycle");
        expect(root.disposed).toBe(0);
    });

    test("should refuse a cross-controller value alias", async () => {
        const value = new Probe("shared");
        service(Probe, value);
        const child = RuntimeController.clone("child");

        expect(() => child.service(Probe, value)).toThrow("owned by lifecycle");

        await child.close();

        expect(value.disposed).toBe(0);
    });

    test("should unload a child service through the child and rebuild it under the child", async () => {
        const child = RuntimeController.clone("child");
        const ref = child.service(Probe, () => new Probe());
        const first = await resolve(ref);

        await unload(ref);
        const second = await resolve(ref);
        await child.close();

        expect(first.disposed).toBe(1);
        expect(second).not.toBe(first);
        expect(second.controller).toBe(child);
        expect(second.disposed).toBe(1);
    });

    test("should forget the child's registrations once the child has closed", async () => {
        const child = RuntimeController.clone("child");
        let calls = 0;
        const builtRef = child.service(Probe, () => new Probe());
        const unbuiltRef = child.service(Probe, () => {
            calls += 1;

            return new Probe();
        });

        const built = await resolve(builtRef);

        await child.close();

        expect(built.disposed).toBe(1);
        expect(state(builtRef)).toEqual({known: false, resolved: false});
        await expect(resolve(builtRef)).rejects.toThrow("Unknown service Probe");
        await expect(resolve(unbuiltRef)).rejects.toThrow("Unknown service Probe");
        expect(calls).toBe(0);
    });

    test("should resolve unload of a pending child build that returns another controller's instance", async () => {
        const rootRef = service(Probe, () => new Probe("root"));
        const child = RuntimeController.clone("child");
        const gate = Promise.withResolvers<void>();
        const aliasRef = child.service(Probe, async () => {
            await gate.promise;

            return resolve(rootRef);
        });

        const building = resolve(aliasRef).catch((reason) => String(reason));
        const unloading = unload(aliasRef);
        gate.resolve();

        expect(await building).toContain("owned by lifecycle");
        await expect(unloading).resolves.toBeUndefined();
        expect((await resolve(rootRef)).disposed).toBe(0);

        await child.close();
    });

    test("should keep a plain root instance when a child registration of the same value is unloaded", async () => {
        class Config {
            readonly name = "config";
        }

        const shared = new Config();
        const rootRef = service(Config, shared);
        const child = RuntimeController.clone("child");
        const childRef = child.service(Config, shared);

        await unload(childRef);

        expect(state(rootRef)).toEqual({known: true, instance: shared, resolved: true});
        expect(state(childRef)).toEqual({known: true, resolved: false});

        await child.close();
    });

    test("should let unload wait for the release of a pending child build that lands while the child closes", async () => {
        const gate = Promise.withResolvers<void>();
        const disposing = Promise.withResolvers<void>();
        let released = 0;

        class Slow {
            async [Symbol.asyncDispose]() {
                released += 1;
                await disposing.promise;
            }
        }

        const child = RuntimeController.clone("child");
        const ref = child.service(Slow, async () => {
            await gate.promise;

            return new Slow();
        });

        const building = resolve(ref).catch((reason) => reason);
        let unloaded = false;
        const unloading = unload(ref).then(() => {
            unloaded = true;
        });

        const closing = child.close();
        gate.resolve();

        expect(await building).toBeInstanceOf(RuntimeClosedException);
        await new Promise((done) => setImmediate(done));
        expect(unloaded).toBeFalse();

        disposing.resolve();
        await unloading;
        await closing;

        expect(released).toBe(1);
    });

    test("should keep a child's value registration until its disposal finishes", async () => {
        const disposing = Promise.withResolvers<void>();
        let released = 0;

        class Slow {
            async [Symbol.asyncDispose]() {
                released += 1;
                await disposing.promise;
            }
        }

        const child = RuntimeController.clone("child");
        const ref = child.service(Slow, new Slow());

        const closing = child.close();
        await new Promise((done) => setImmediate(done));
        const known = state(ref).known;
        let unloaded = false;
        const unloading = unload(ref).then(() => {
            unloaded = true;
        });

        await new Promise((done) => setImmediate(done));

        expect(released).toBe(1);
        expect(known).toBeTrue();
        expect(unloaded).toBeFalse();

        disposing.resolve();
        await unloading;
        await closing;

        expect(state(ref).known).toBeFalse();
    });

    test("should leave no registration behind when the root refuses a child-owned value", async () => {
        class Alias extends Probe {}
        const child = RuntimeController.clone("child");
        const value = new Probe("child");
        child.service(Probe, value);

        expect(() => service(Alias, value)).toThrow("owned by child");
        expect(() => state(Alias)).toThrow("Unknown service reference");

        await child.close();
    });

    test("should keep a child's alias registrations until the instance they share finishes disposal", async () => {
        const disposing = Promise.withResolvers<void>();

        class Slow {
            async [Symbol.asyncDispose]() {
                await disposing.promise;
            }
        }

        const child = RuntimeController.clone("child");
        const owned = child.own(new Slow());
        const shared = new Slow();
        const firstRef = child.service(Slow, shared);
        const secondRef = child.service(Slow, shared);
        const ownedRef = child.service(Slow, owned);

        const closing = child.close();
        await new Promise((done) => setImmediate(done));
        const known = [state(firstRef).known, state(secondRef).known, state(ownedRef).known];
        let unloaded = false;
        const unloading = unload(secondRef).then(() => {
            unloaded = true;
        });

        await new Promise((done) => setImmediate(done));

        expect(known).toEqual([true, true, true]);
        expect(unloaded).toBeFalse();

        disposing.resolve();
        await unloading;
        await closing;

        expect([state(firstRef).known, state(secondRef).known, state(ownedRef).known]).toEqual([false, false, false]);
    });
});
