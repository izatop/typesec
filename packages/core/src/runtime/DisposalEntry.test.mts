import {describe, expect, mock, test} from "bun:test";
import {DisposalEntry} from "./DisposalEntry.mjs";

describe("DisposalEntry", () => {
    test("should lazily share one cleanup promise during and after disposal", async () => {
        const {promise: gate, resolve: release} = Promise.withResolvers<void>();
        const resource = {[Symbol.asyncDispose]: mock(() => gate)};
        const entry = new DisposalEntry(resource);

        expect(entry.resource).toBe(resource);
        expect(entry.state).toBe("idle");
        expect(resource[Symbol.asyncDispose]).not.toHaveBeenCalled();

        let settled = false;

        const pending = entry.dispose();
        const observed = pending.then(() => {
            settled = true;
        });

        try {
            const concurrent = entry.dispose();

            expect(concurrent).toBe(pending);
            expect(entry.state).toBe("disposing");
            expect(resource[Symbol.asyncDispose]).not.toHaveBeenCalled();

            await Promise.resolve();

            expect(settled).toBeFalse();
            expect(entry.state).toBe("disposing");
            expect(resource[Symbol.asyncDispose]).toHaveBeenCalledTimes(1);
        } finally {
            release();
            await observed;
        }

        const repeated = entry.dispose();

        expect(settled).toBeTrue();
        expect(entry.state).toBe("settled");
        expect(repeated).toBe(pending);
        expect(resource[Symbol.asyncDispose]).toHaveBeenCalledTimes(1);
    });

    test("a reentrant sync hook should receive the cached cleanup promise", async () => {
        let reentrant: Promise<void> | undefined;
        const resource = {
            [Symbol.dispose]: mock(() => {
                reentrant = entry.dispose();
            }),
        };
        const entry = new DisposalEntry(resource);

        const pending = entry.dispose();
        await pending;
        const repeated = entry.dispose();

        expect(reentrant).toBe(pending);
        expect(repeated).toBe(pending);
        expect(entry.state).toBe("settled");
        expect(resource[Symbol.dispose]).toHaveBeenCalledTimes(1);
    });

    test("should retain the rejected promise and original async disposal error", async () => {
        const reason = new Error("Async cleanup failed");
        const resource = {
            [Symbol.asyncDispose]: mock(async () => {
                throw reason;
            }),
        };
        const entry = new DisposalEntry(resource);

        const pending = entry.dispose();

        await expect(pending).rejects.toBe(reason);
        expect(entry.state).toBe("settled");

        const repeated = entry.dispose();

        expect(repeated).toBe(pending);
        await expect(repeated).rejects.toBe(reason);
        expect(resource[Symbol.asyncDispose]).toHaveBeenCalledTimes(1);
    });

    test("should retain the rejected promise after a sync disposal throw without retrying", async () => {
        const reason = new Error("Sync cleanup failed");
        const resource = {
            [Symbol.dispose]: mock(() => {
                throw reason;
            }),
        };
        const entry = new DisposalEntry(resource);

        const pending = entry.dispose();

        await expect(pending).rejects.toBe(reason);
        expect(entry.state).toBe("settled");

        const repeated = entry.dispose();

        expect(repeated).toBe(pending);
        await expect(repeated).rejects.toBe(reason);
        expect(resource[Symbol.dispose]).toHaveBeenCalledTimes(1);
    });
});
