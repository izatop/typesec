import {expect, mock, spyOn, test} from "bun:test";
import {lifecycle} from "./controller/index.mjs";
import {main} from "./main.mjs";

test("main", async () => {
    const disposeSpy = spyOn(lifecycle, Symbol.dispose).mockImplementation(() => {});
    try {
        const task = mock(async function task() {});
        const timer = await main(task);
        clearImmediate(timer);

        expect(task.mock.calls).toEqual([[]]);
        expect(task.mock.results.length).toBe(1);
        expect(disposeSpy.mock.calls.length).toBe(1);
    } finally {
        disposeSpy.mockRestore();
    }
});
