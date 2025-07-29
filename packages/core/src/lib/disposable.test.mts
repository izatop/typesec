import {describe, expect, test} from "bun:test";
import {isAsyncDisposable, isDisposable} from "./dispostable.mts";

describe("disposable", () => {
    test("isAsyncDisposable(value)", async () => {
        const disposable = {
            [Symbol.asyncDispose]: async () => void 0,
        };

        expect(isAsyncDisposable(disposable)).toBeTrue();
        expect(isAsyncDisposable({})).toBeFalse();
    });

    test("isDisposable(value)", async () => {
        const disposable = {
            [Symbol.dispose]: () => void 0,
        };

        expect(isDisposable(disposable)).toBeTrue();
        expect(isDisposable({})).toBeFalse();
    });
});
