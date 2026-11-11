import {describe, expect, mock, test} from "bun:test";
import {dispose} from "../index.mjs";
import {toAsyncDisposable, toDisposable} from "../lib/dispostable.mjs";

describe("dispose", () => {
    test("should async dispose", async () => {
        const cleanup = mock(async () => void 0);
        const disposable = toAsyncDisposable(cleanup);

        await dispose(disposable);

        expect(cleanup.mock.calls.length).toBe(1);
    });

    test("should dispose", async () => {
        const cleanup = mock(() => void 0);
        const disposable = toDisposable(cleanup);

        await dispose(disposable);

        expect(cleanup.mock.calls.length).toBe(1);
    });
});
