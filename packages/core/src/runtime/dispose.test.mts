import {describe, expect, mock, test} from "bun:test";
import {dispose} from "../index.mts";

describe("dispose", () => {
    test("should async dispose", async () => {
        const disposable = {
            [Symbol.asyncDispose]: mock(async () => void 0),
        };

        await dispose(disposable);
        expect(disposable[Symbol.asyncDispose].mock.calls.length).toBe(1);
    });

    test("should dispose", async () => {
        const disposable = {
            [Symbol.dispose]: mock(() => void 0),
        };

        await dispose(disposable);
        expect(disposable[Symbol.dispose].mock.calls.length).toBe(1);
    });
});
