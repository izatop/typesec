import {describe, expect, mock, test} from "bun:test";
import {run} from "../index.mjs";
import {lifecycle, runtime} from "./runtime.mts";

describe("run()", () => {
    test("should run a task", async () => {
        const task = mock(async () => {
            return {name: "test"};
        });

        const res = await run(task);

        expect(res.name).toBe("test");
        expect(task.mock.calls.length).toBe(1);
    });

    test("should run a task with a context", async () => {
        const task = mock(async () => {
            return runtime.use().id;
        });

        const context = lifecycle.clone("c");
        const res = await run(task, context);

        expect(res).toBe("c");
    });

    test("should throw an error", async () => {
        const task = mock(async () => {
            throw new Error();
        });

        expect(run(task)).rejects.toThrowError();
    });
});
