import {describe, expect, test} from "bun:test";
import {RuntimeController} from "./RuntimeController.mts";

describe("RuntimeController", () => {
    test("lifecycle should be a singleton", () => {
        const runtime = RuntimeController.lifecycle;

        expect(runtime.clone()).toBeInstanceOf(RuntimeController);
        expect(RuntimeController.lifecycle).toBe(runtime);
    });

    test("calling lifecycle() should create isolated clones", () => {
        const clone = RuntimeController.lifecycle.clone();
        expect(clone).not.toBe(RuntimeController.lifecycle);
        expect(clone.id).not.toBe(RuntimeController.lifecycle.id);
    });

    test("clone() should produce independent RuntimeController", () => {
        const root = new RuntimeController();
        const child = root.clone();

        expect(child).not.toBe(root);
        expect(child.id).not.toBe(root.id);
    });

    test("isRunning() reflects signal state correctly", () => {
        const runtime = new RuntimeController();
        expect(runtime.isRunning()).toBe(true);

        runtime.abort();
        expect(runtime.isRunning()).toBe(false);
    });

    test("abort() should be idempotent and return self", () => {
        const runtime = new RuntimeController();

        const first = runtime.abort();
        expect(first).toBe(runtime);
        expect(runtime.signal.aborted).toBe(true);

        const second = runtime.abort();
        expect(second).toBe(runtime);
    });

    test("enqueue() should propagate abort to children", () => {
        const parent = new RuntimeController();
        const child = new RuntimeController();

        parent.enqueue(child);
        parent.abort();

        expect(child.signal.aborted).toBe(true);
    });

    test("enqueue() should throw if throwIfAborted is true and parent aborted", () => {
        const parent = new RuntimeController();
        const child = new RuntimeController();

        expect(() => parent.abort().enqueue(child, true)).toThrow("Parent instance has already aborted");
    });

    test("enqueue() should throw if throwIfAborted is true and child already aborted", () => {
        const parent = new RuntimeController();
        const child = new RuntimeController();

        expect(() => parent.enqueue(child.abort(), true)).toThrow("Child instance has already aborted");
    });

    test("enqueue() should immediately abort child if parent already aborted and throwIfAborted is false", () => {
        const parent = new RuntimeController();
        const child = new RuntimeController();

        parent.abort();
        parent.enqueue(child);
        expect(child.signal.aborted).toBe(true);
    });

    test("wait() should resolve after delay if running", async () => {
        const timeout = 50;
        const runtime = new RuntimeController();

        const started = Date.now();
        await runtime.wait(timeout);

        expect(Date.now()).toBeGreaterThanOrEqual(started + timeout);
    });

    test("wait() should resolve immediately if aborted", async () => {
        const timeout = 50;
        const runtime = new RuntimeController();

        const started = Date.now();
        await runtime.abort().wait(100);

        expect(Date.now()).toBeLessThan(started + timeout);
    });

    test("start() returns lifecycle and sets up signal handlers", () => {
        const started = RuntimeController.start();
        expect(started).toBe(RuntimeController.lifecycle);
        expect(process.listeners("SIGINT")).toContainValue(started.abort);
        started.abort();
    });

    test("only() should throw if mode does not match", () => {
        const runtime = new RuntimeController();

        // @ts-expect-error
        expect(() => runtime.only(runtime.mode)).not.toThrow();

        // @ts-expect-error
        expect(() => runtime.only("some_other_mode")).toThrow();
    });
});
