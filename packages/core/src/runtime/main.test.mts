import {expect, mock, test} from "bun:test";
import {main} from "./main.mts";

test("main", async () => {
    const value = Math.random();
    const task = mock(async function task() {
        return value;
    });

    const timer = await main(task);

    clearImmediate(timer);

    expect(task.mock.calls).toEqual([[]]);

    expect(task.mock.results.length).toBe(1);
    expect(task.mock.results[0]?.value).resolves.toBe(value);
});
