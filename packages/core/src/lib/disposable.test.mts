import {describe, expect, mock, test} from "bun:test";
import {isXEqualToY} from "@typesec/the/test";
import {toAsyncDisposable as exportedAsync, toDisposable as exportedSync} from "../index.mjs";
import {
    isAsyncDisposable,
    isDisposable,
    toAsyncDisposable,
    toDisposable,
    withDisposable,
    withDisposablePending,
} from "./dispostable.mjs";

describe("disposable", () => {
    test("isAsyncDisposable(value)", () => {
        const resource = toAsyncDisposable(() => void 0);

        expect(isAsyncDisposable(resource)).toBeTrue();
        expect(isAsyncDisposable({})).toBeFalse();
    });

    test("isDisposable(value)", () => {
        const resource = toDisposable(() => void 0);

        expect(isDisposable(resource)).toBeTrue();
        expect(isDisposable({})).toBeFalse();
    });
});

describe("disposal adapters", () => {
    test("toDisposable should defer cleanup until using exits and preserve its receiver", () => {
        let receiver: unknown;
        const cleanup = mock(function (this: unknown) {
            receiver = this;
        });
        const resource = toDisposable(cleanup);

        expect(exportedSync).toBe(toDisposable);
        expect(isXEqualToY<typeof resource, Disposable>(true)).toBeTrue();
        expect(cleanup).not.toHaveBeenCalled();
        expect(isAsyncDisposable(resource)).toBeFalse();

        {
            using owned = resource;
        }

        expect(cleanup.mock.calls).toEqual([[]]);
        expect(receiver).toBe(resource);
    });

    test("toDisposable should propagate the original synchronous cleanup error", () => {
        const reason = new Error("Synchronous cleanup failed");
        const resource = toDisposable(() => {
            throw reason;
        });
        let failure: unknown;

        try {
            using owned = resource;
        } catch (error) {
            failure = error;
        }

        expect(failure).toBe(reason);
    });

    test("toAsyncDisposable should await a thenable during await using and preserve its receiver", async () => {
        const {promise: gate, resolve: release} = Promise.withResolvers<void>();
        const {promise: started, resolve: markStarted} = Promise.withResolvers<void>();
        const thenable: PromiseLike<void> = {
            then: (resolve, reject) => gate.then(resolve, reject),
        };
        let receiver: unknown;
        let settled = false;
        const cleanup = mock(function (this: unknown) {
            receiver = this;
            markStarted();

            return thenable;
        });
        const resource = toAsyncDisposable(cleanup);

        expect(exportedAsync).toBe(toAsyncDisposable);
        expect(isXEqualToY<typeof resource, AsyncDisposable>(true)).toBeTrue();
        expect(cleanup).not.toHaveBeenCalled();
        expect(isDisposable(resource)).toBeFalse();

        const pending = (async () => {
            await using owned = resource;
        })().then(() => {
            settled = true;
        });

        try {
            await started;
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(settled).toBeFalse();
            expect(cleanup.mock.calls).toEqual([[]]);
            expect(receiver).toBe(resource);
        } finally {
            release();
            await pending;
        }

        expect(settled).toBeTrue();
    });

    for (const mode of ["throw", "reject"] as const) {
        test(`toAsyncDisposable should preserve a callback ${mode} as a rejection`, async () => {
            const reason = new Error("Asynchronous cleanup failed");
            const cleanup = mock(() => {
                if (mode === "throw") throw reason;

                return Promise.reject(reason);
            });
            const resource = toAsyncDisposable(cleanup);

            const pending = resource[Symbol.asyncDispose]();

            await expect(pending).rejects.toBe(reason);
            expect(cleanup.mock.calls).toEqual([[]]);
        });
    }

    test("withDisposable adapters should retain target identity and the disposal receiver", async () => {
        const object = {name: "resource"};
        const promise = Promise.resolve(42);
        const receivers: unknown[] = [];
        const cleanup = mock(function (this: unknown) {
            receivers.push(this);
        });
        const resource = withDisposable(object, cleanup);
        const pending = withDisposablePending(promise, cleanup);

        expect(object).toBe(resource);
        expect(promise).toBe(pending);
        expect(cleanup).not.toHaveBeenCalled();

        {
            using owned = resource;
            using task = pending;

            expect(await task).toBe(42);
        }

        expect(receivers).toEqual([promise, object]);
        expect(cleanup.mock.calls).toEqual([[], []]);
    });
});
