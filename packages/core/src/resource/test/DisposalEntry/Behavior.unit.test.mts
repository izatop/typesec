import {describe, expect, mock, test} from "bun:test";

import {toAsyncDisposable, toDisposable} from "../../../lib/dispostable.mjs";
import {DisposalEntry} from "../../DisposalEntry.mjs";

describe("DisposalEntry", () => {
    test("should lazily share one cleanup promise during and after disposal", async () => {
        const {promise: gate, resolve: release} = Promise.withResolvers<void>();
        const cleanup = mock(() => gate);
        const resource = toAsyncDisposable(cleanup);
        const entry = new DisposalEntry(resource);

        expect(entry.resource).toBe(resource);
        expect(entry.state).toBe("idle");
        expect(cleanup).not.toHaveBeenCalled();

        let settled = false;

        const pending = entry.dispose();
        const observed = pending.then(() => {
            settled = true;
        });

        try {
            const concurrent = entry.dispose();

            expect(concurrent).toBe(pending);
            expect(entry.state).toBe("disposing");
            expect(cleanup).not.toHaveBeenCalled();

            await Promise.resolve();

            expect(settled).toBeFalse();
            expect(entry.state).toBe("disposing");
            expect(cleanup).toHaveBeenCalledTimes(1);
        } finally {
            release();
            await observed;
        }

        const repeated = entry.dispose();

        expect(settled).toBeTrue();
        expect(entry.state).toBe("settled");
        expect(repeated).toBe(pending);
        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("a reentrant sync hook should receive the cached cleanup promise", async () => {
        let reentrant: Promise<void> | undefined;
        const cleanup = mock(() => {
            reentrant = entry.dispose();
        });
        const resource = toDisposable(cleanup);
        const entry = new DisposalEntry(resource);

        const pending = entry.dispose();
        await pending;
        const repeated = entry.dispose();

        expect(reentrant).toBe(pending);
        expect(repeated).toBe(pending);
        expect(entry.state).toBe("settled");
        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("should retain the rejected promise and original async disposal error", async () => {
        const reason = new Error("Async cleanup failed");
        const cleanup = mock(async () => {
            throw reason;
        });
        const resource = toAsyncDisposable(cleanup);
        const entry = new DisposalEntry(resource);

        const pending = entry.dispose();

        await expect(pending).rejects.toBe(reason);
        expect(entry.state).toBe("settled");

        const repeated = entry.dispose();

        expect(repeated).toBe(pending);
        await expect(repeated).rejects.toBe(reason);
        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("should retain the rejected promise after a sync disposal throw without retrying", async () => {
        const reason = new Error("Sync cleanup failed");
        const cleanup = mock(() => {
            throw reason;
        });
        const resource = toDisposable(cleanup);
        const entry = new DisposalEntry(resource);

        const pending = entry.dispose();

        await expect(pending).rejects.toBe(reason);
        expect(entry.state).toBe("settled");

        const repeated = entry.dispose();

        expect(repeated).toBe(pending);
        await expect(repeated).rejects.toBe(reason);
        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("should settle without starting cleanup and resolve after a failed attempt", async () => {
        const reason = new Error("Cleanup failed");
        const cleanup = mock(() => {
            throw reason;
        });
        const entry = new DisposalEntry(toDisposable(cleanup));
        let settled = false;

        void entry.settled.then(() => {
            settled = true;
        });

        await Promise.resolve();

        expect(settled).toBeFalse();
        expect(cleanup).not.toHaveBeenCalled();

        await expect(entry.dispose()).rejects.toBe(reason);
        await entry.settled;

        expect(settled).toBeTrue();
    });
});
