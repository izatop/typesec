import {describe, expect, test} from "bun:test";

import {lifecycle, RuntimeController} from "../../../runtime/controller/index.mjs";
import {runtime} from "../../../runtime/runtime.mjs";
import {resolve, service} from "../../fn.mjs";

describe("service owner", () => {
    // A probe records the ambient controller at construction, which is where its factory runs.
    class Probe {
        readonly controller = runtime.use();
        readonly signal = runtime.signal;
    }

    test("should build in the root context when resolved from a child task", async () => {
        const child = RuntimeController.clone("child");
        const ref = service(Probe, () => new Probe());
        const task = async () => ({caller: runtime.use(), probe: await resolve(ref)});

        const {caller, probe} = await runtime.run(task, child);

        expect(caller).toBe(child);
        expect(probe.controller).toBe(lifecycle);
        expect(probe.signal).toBe(lifecycle.signal);
    });

    test("should keep a pending factory on the root signal while the child that resolved it closes", async () => {
        const child = RuntimeController.clone("child");
        const gate = Promise.withResolvers<void>();
        const ref = service(Probe, async () => {
            const probe = new Probe();
            await gate.promise;

            return probe;
        });

        const resolving = child.run(() => resolve(ref));
        const closing = child.close("stopped");
        gate.resolve();
        const probe = await resolving;
        await closing;

        expect(child.signal.aborted).toBeTrue();
        expect(probe.controller).toBe(lifecycle);
        expect(probe.signal.aborted).toBeFalse();
    });

    test("should build an eager service under the root even when registered from a child task", async () => {
        const child = RuntimeController.clone("child");

        const ref = await runtime.run(() => service(Probe, () => new Probe(), false), child);
        const probe = await resolve(ref);

        expect(probe.controller).toBe(lifecycle);
    });

    test("should refuse to build once the root began closing, without calling the factory", () => {
        // Closing the real lifecycle inside the runner would stop every later suite, so observe it in a child process.
        const script = `
            import {resolve, service} from ${JSON.stringify(`${import.meta.dir}/../../fn.mts`)};
            import {lifecycle, RuntimeClosedException} from ${JSON.stringify(`${import.meta.dir}/../../../runtime/controller/index.mts`)};

            const calls = [];
            const ref = service(class Probe {}, () => {
                calls.push("factory");

                return {};
            });

            lifecycle.close();
            setTimeout(() => process.exit(1), 1000);
            const outcome = await resolve(ref).then(
                () => "built",
                (reason) => (reason instanceof RuntimeClosedException ? "closed" : String(reason)),
            );

            console.log(JSON.stringify({outcome, calls}));
            process.exit(0);
        `;

        const result = Bun.spawnSync({cmd: [process.execPath, "-e", script], stdout: "pipe", stderr: "pipe"});

        expect(result.stderr.toString()).toBe("");
        expect(result.exitCode).toBe(0);
        expect(JSON.parse(result.stdout.toString())).toEqual({outcome: "closed", calls: []});
    });
});
