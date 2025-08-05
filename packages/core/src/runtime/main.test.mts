import {expect, mock, test} from "bun:test";
import {main} from "./main.mts";

test("main", async () => {
    const task = mock(async function task() {});
    const timer = await main(task);
    clearImmediate(timer);

    expect(task.mock.calls).toEqual([[]]);
    expect(task.mock.results.length).toBe(1);
});
