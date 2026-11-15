import {describe, expect, mock, test} from "bun:test";
import {
    isAsyncDisposable,
    isDisposable,
    toAsyncDisposable,
    toDisposable,
    withDisposable,
    withDisposablePending,
} from "../../dispostable.mjs";

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

    test("callable resources should count by their hooks like objects", () => {
        const sync = Object.assign(() => void 0, {[Symbol.dispose]: () => void 0});
        const async = Object.assign(() => void 0, {[Symbol.asyncDispose]: async () => void 0});

        expect(isDisposable(sync)).toBeTrue();
        expect(isAsyncDisposable(sync)).toBeFalse();
        expect(isAsyncDisposable(async)).toBeTrue();
        expect(isDisposable(async)).toBeFalse();
        expect(isDisposable(() => void 0)).toBeFalse();
    });
});

describe("disposal adapters", () => {
    test("toDisposable should defer cleanup until using exits and preserve its receiver", () => {
        const cleanup = mock(() => void 0);
        const resource = toDisposable(cleanup);

        expect(cleanup).not.toHaveBeenCalled();
        expect(isAsyncDisposable(resource)).toBeFalse();

        {
            using _owned = resource;
        }

        expect(cleanup.mock.calls).toEqual([[]]);
        expect(cleanup.mock.contexts).toEqual([resource]);
    });

    test("toDisposable should propagate the original synchronous cleanup error", () => {
        const reason = new Error("Synchronous cleanup failed");
        const resource = toDisposable(() => {
            throw reason;
        });
        let failure: unknown;

        try {
            using _owned = resource;
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
        let settled = false;
        const cleanup = mock(() => {
            markStarted();

            return thenable;
        });
        const resource = toAsyncDisposable(cleanup);

        expect(cleanup).not.toHaveBeenCalled();
        expect(isDisposable(resource)).toBeFalse();

        const pending = (async () => {
            await using _owned = resource;
        })().then(() => {
            settled = true;
        });

        try {
            await started;
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(settled).toBeFalse();
            expect(cleanup.mock.calls).toEqual([[]]);
            expect(cleanup.mock.contexts).toEqual([resource]);
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
        const cleanup = mock(() => void 0);
        const resource = withDisposable(object, cleanup);
        const pending = withDisposablePending(promise, cleanup);

        expect(object).toBe(resource);
        expect(promise).toBe(pending);
        expect(cleanup).not.toHaveBeenCalled();

        {
            using _owned = resource;
            using task = pending;

            expect(await task).toBe(42);
        }

        expect(cleanup.mock.contexts).toEqual([promise, object]);
        expect(cleanup.mock.calls).toEqual([[], []]);
    });
});
