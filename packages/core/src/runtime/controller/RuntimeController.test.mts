import {describe, expect, test} from "bun:test";
import {ExitSignals} from "../../const.mts";
import {lifecycle} from "../runtime.mts";
import {RuntimeController} from "./RuntimeController.mts";

describe("RuntimeController", () => {
    test("lifecycle should be initalized", async () => {
        test.each(ExitSignals)("test", (signal) => expect(process.listeners(signal)).toContainValue(lifecycle.abort));
    });

    test("lifecycle should be a singleton", async () => {
        expect(RuntimeController.lifecycle).toBe(lifecycle);
    });

    test("lifecycle should be detected as iteself", async () => {
        expect(RuntimeController.lifecycle.isLifecycle()).toBeTrue();
        expect(lifecycle.isLifecycle()).toBeTrue();

        using clone = lifecycle.clone();
        expect(clone.isLifecycle()).toBeFalse();
    });

    test("clone() should create isolated clones", async () => {
        using clone = RuntimeController.clone();
        expect(clone).not.toBe(RuntimeController.lifecycle);
        expect(clone.id).not.toBe(RuntimeController.lifecycle.id);
    });

    test("clone() should produce independent RuntimeController", async () => {
        using runtime = RuntimeController.clone();
        using child = runtime.clone();

        expect(child).not.toBe(runtime);
        expect(child.id).not.toBe(runtime.id);
    });

    test("abort() should be called in cascade", async () => {
        using runtime = RuntimeController.clone();
        using child = runtime.clone();

        runtime.abort();
        expect(child.signal.aborted).toBeTrue();
    });

    test("abort() should detach from parent", async () => {
        using child = lifecycle.clone("123");

        expect(lifecycle.has(child)).toBeTrue();
        expect(child.abort().signal.aborted).toBeTrue();
        expect(lifecycle.has(child)).toBeFalse();
    });

    test("isRunning() reflects signal state correctly", async () => {
        using runtime = RuntimeController.clone();
        expect(runtime.isRunning()).toBe(true);

        runtime.abort();
        expect(runtime.isRunning()).toBe(false);
        expect(runtime.heartbeat()).resolves.not.fail();
    });

    test("heartbeat() should resolves correctly", async () => {
        using runtime = RuntimeController.clone();
        let resolved = false;
        const pending = runtime.heartbeat().then(() => (resolved = true));
        await Promise.resolve();
        expect(resolved).toBeFalse();

        runtime.abort();
        expect(await pending).resolves.not.fail();
        expect(resolved).toBeTrue();
    });

    test("enqueue() should propagate abort to children", async () => {
        using parent = RuntimeController.clone();
        using child = RuntimeController.clone();

        parent.enqueue(child);
        parent.abort();

        expect(child.signal.aborted).toBe(true);
    });

    test("enqueue() should throw if throwIfAborted is true and parent aborted", async () => {
        using parent = RuntimeController.clone();
        using child = RuntimeController.clone();

        expect(() => parent.abort().enqueue(child, true)).toThrow("Parent instance has already aborted");
    });

    test("enqueue() should throw if throwIfAborted is true and child already aborted", async () => {
        using parent = RuntimeController.clone();
        using child = RuntimeController.clone();

        expect(() => parent.enqueue(child.abort(), true)).toThrow("Child instance has already aborted");
    });

    test("enqueue() should immediately abort child if parent already aborted and throwIfAborted is false", async () => {
        using parent = RuntimeController.clone();
        using child = RuntimeController.clone();

        parent.abort();
        parent.enqueue(child);
        expect(child.signal.aborted).toBe(true);
    });

    test("wait() should resolve after delay if running", async () => {
        const timeout = 50;
        using runtime = RuntimeController.clone();

        const started = Date.now();
        await runtime.wait(timeout);

        expect(Date.now()).toBeGreaterThanOrEqual(started + timeout);
    });

    test("wait() should resolve immediately if aborted", async () => {
        const timeout = 50;
        using runtime = RuntimeController.clone();

        const started = Date.now();
        await runtime.abort().wait(100);

        expect(Date.now()).toBeLessThan(started + timeout);
    });

    test("only() should throw if mode does not match", async () => {
        using runtime = RuntimeController.clone();

        // @ts-expect-error
        expect(() => runtime.only(runtime.mode)).not.toThrow();

        // @ts-expect-error
        expect(() => runtime.only("some_other_mode")).toThrow();
    });
});
