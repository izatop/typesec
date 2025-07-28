import {expect, mock, test} from "bun:test";
import {watch} from "../index.mjs";

test("watch", async () => {
    const disposer = mock(async () => void 0);

    const main = mock(async () => {
        return {[Symbol.asyncDispose]: disposer};
    });

    clearImmediate(await watch(main));

    expect(disposer.mock.calls.length).toBe(1);
    expect(main.mock.calls.length).toBe(1);
});
