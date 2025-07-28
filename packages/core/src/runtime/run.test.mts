import {expect, mock, test} from "bun:test";
import {run} from "../index.mjs";
import {runtime} from "./runtime.mts";

test("watch", async () => {
    const disposer = mock(async () => void 0);

    const main = mock(async () => {
        return {[Symbol.asyncDispose]: disposer};
    });

    clearImmediate(await run(main));

    expect(disposer.mock.calls.length).toBe(1);
    expect(main.mock.calls.length).toBe(1);
    expect(runtime);
});
