import {AssertionException} from "@typesec/the/errors";
import {describe, expect, spyOn, test} from "bun:test";
import {ExitSignals} from "../../../../const.mjs";
import {lifecycle} from "../../index.mjs";
import {RuntimeController} from "../../RuntimeController.mjs";

describe("RuntimeController regressions", () => {
    test("a trapped controller should finish abort dispatch before releasing its children", () => {
        const parent = RuntimeController.clone();
        const initialListeners = ExitSignals.map((signal) => process.listenerCount(signal));
        const originalClearInterval = globalThis.clearInterval;
        const intervals = spyOn(globalThis, "setInterval");
        const clearedIntervals = spyOn(globalThis, "clearInterval");

        try {
            parent.trap();
            using child = parent.clone();
            using grandchild = child.clone();
            let observed: boolean[] = [];
            parent.signal.addEventListener(
                "abort",
                () => {
                    observed = [child.signal.aborted, grandchild.signal.aborted];
                },
                {once: true},
            );

            expect(ExitSignals.map((signal) => process.listenerCount(signal))).toEqual(
                initialListeners.map((count) => count + 1),
            );

            expect(intervals).toHaveBeenCalledTimes(1);

            const locker = intervals.mock.results[0]!.value;
            const reason = new Error("Stop the trapped controller");

            const result = parent.abort(reason);

            expect(result).toBe(parent);
            expect(parent.signal.reason).toBe(reason);
            expect(observed).toEqual([true, true]);
            expect(clearedIntervals).toHaveBeenCalledTimes(1);
            expect(clearedIntervals).toHaveBeenCalledWith(locker);
            expect(ExitSignals.map((signal) => process.listenerCount(signal))).toEqual(initialListeners);

            parent.abort(reason);
            const disposed = parent[Symbol.dispose]();

            expect(disposed).toBeUndefined();
            expect(clearedIntervals).toHaveBeenCalledTimes(1);
        } finally {
            parent[Symbol.dispose]();
            lifecycle.detach(parent);

            for (const result of intervals.mock.results) {
                if (result.type === "return") originalClearInterval(result.value);
            }

            intervals.mockRestore();
            clearedIntervals.mockRestore();
        }
    });

    test("disposing a trapped controller should clear its timer and signal handlers once", () => {
        const parent = RuntimeController.clone();
        const initialListeners = ExitSignals.map((signal) => process.listenerCount(signal));
        const originalClearInterval = globalThis.clearInterval;
        const intervals = spyOn(globalThis, "setInterval");
        const clearedIntervals = spyOn(globalThis, "clearInterval");

        try {
            parent.trap();

            expect(intervals).toHaveBeenCalledTimes(1);

            const locker = intervals.mock.results[0]!.value;

            const result = parent[Symbol.dispose]();

            expect(result).toBeUndefined();
            expect(parent.signal.aborted).toBeTrue();
            expect(clearedIntervals).toHaveBeenCalledTimes(1);
            expect(clearedIntervals).toHaveBeenCalledWith(locker);
            expect(ExitSignals.map((signal) => process.listenerCount(signal))).toEqual(initialListeners);

            parent[Symbol.dispose]();

            expect(clearedIntervals).toHaveBeenCalledTimes(1);
        } finally {
            parent[Symbol.dispose]();
            lifecycle.detach(parent);

            for (const result of intervals.mock.results) {
                if (result.type === "return") originalClearInterval(result.value);
            }

            intervals.mockRestore();
            clearedIntervals.mockRestore();
        }
    });

    test("disposing a child should abort it and its children before detaching them", () => {
        using parent = RuntimeController.clone();
        using child = parent.clone();
        using grandchild = child.clone();

        child[Symbol.dispose]();

        expect(parent.has(child)).toBeFalse();
        expect(child.has(grandchild)).toBeFalse();
        expect(child.signal.aborted).toBeTrue();
        expect(grandchild.signal.aborted).toBeTrue();
    });

    test("enqueue() should not retain a duplicate listener after detach", () => {
        using parent = RuntimeController.clone();
        const child = new AbortController();
        const abort = spyOn(child, "abort");

        try {
            parent.enqueue(child).enqueue(child);
            child.abort();
            abort.mockClear();
            parent.detach(child);

            parent.abort();

            expect(parent.has(child)).toBeFalse();
            expect(abort).not.toHaveBeenCalled();
        } finally {
            abort.mockRestore();
        }
    });

    test("detach() should reject a running child without removing its abort callback", () => {
        using parent = RuntimeController.clone();
        const child = new AbortController();
        const abort = spyOn(child, "abort");

        try {
            parent.enqueue(child);

            expect(() => parent.detach(child)).toThrow(AssertionException);
            expect(parent.has(child)).toBeTrue();

            parent.abort();

            expect(child.signal.aborted).toBeTrue();
            expect(abort).toHaveBeenCalledTimes(1);
        } finally {
            abort.mockRestore();
        }
    });

    test("a generic child that aborts itself should release every parent's cancellation link", () => {
        using first = RuntimeController.clone();
        using second = RuntimeController.clone();
        const child = new AbortController();
        const removed = spyOn(first.signal, "removeEventListener");

        try {
            first.enqueue(child);
            second.enqueue(child);

            child.abort();

            expect(first.has(child)).toBeFalse();
            expect(second.has(child)).toBeFalse();
            expect(removed).toHaveBeenCalledTimes(1);
        } finally {
            removed.mockRestore();
        }
    });

    test("enqueue() should not link a child that has already aborted", () => {
        using parent = RuntimeController.clone();
        const child = new AbortController();
        const listeners = spyOn(parent.signal, "addEventListener");

        try {
            child.abort();

            expect(parent.enqueue(child)).toBe(parent);
            expect(parent.has(child)).toBeFalse();
            expect(listeners).not.toHaveBeenCalled();
            expect(() => parent.enqueue(child, true)).toThrow(AssertionException);
        } finally {
            listeners.mockRestore();
        }
    });

    test("trap() should refuse a second call without registering its listeners again", () => {
        const parent = RuntimeController.clone();
        const initialListeners = ExitSignals.map((signal) => process.listenerCount(signal));

        try {
            parent.trap();

            expect(() => parent.trap()).toThrow("trap(): already called");
            expect(ExitSignals.map((signal) => process.listenerCount(signal))).toEqual(
                initialListeners.map((count) => count + 1),
            );
        } finally {
            parent.abort();
            lifecycle.detach(parent);
        }
    });

    test("trap() should reject a disposed controller before registering resources", () => {
        const parent = RuntimeController.clone();
        parent[Symbol.dispose]();

        const initialListeners = ExitSignals.map((signal) => process.listenerCount(signal));
        const listeners = spyOn(process, "once");
        const intervals = spyOn(globalThis, "setInterval");

        try {
            expect(() => parent.trap()).toThrow();

            expect(listeners).not.toHaveBeenCalled();
            expect(intervals).not.toHaveBeenCalled();
            expect(ExitSignals.map((signal) => process.listenerCount(signal))).toEqual(initialListeners);
        } finally {
            listeners.mockRestore();
            intervals.mockRestore();

            for (const signal of ExitSignals) process.removeListener(signal, parent.terminate);
            lifecycle.detach(parent);
        }
    });

    test("enqueue() should immediately abort a child after disposing its parent", () => {
        const parent = RuntimeController.clone();
        const child = new AbortController();
        parent[Symbol.dispose]();

        const listeners = spyOn(parent.signal, "addEventListener");

        try {
            const result = parent.enqueue(child);

            expect(result).toBe(parent);
            expect(listeners).not.toHaveBeenCalled();
            expect(parent.has(child)).toBeFalse();
            expect(child.signal.aborted).toBeTrue();
        } finally {
            for (const [type, listener] of listeners.mock.calls) {
                parent.signal.removeEventListener(type, listener);
            }

            listeners.mockRestore();
            lifecycle.detach(parent);
        }
    });
});
