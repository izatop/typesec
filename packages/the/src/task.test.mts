import {describe, expect, test} from "bun:test";
import {task} from "./task.mjs";

describe("task", () => {
    test("settle(promise) should convert fulfilled and rejected promises", async () => {
        await expect(task.settle(Promise.resolve(1))).resolves.toEqual({status: "fulfilled", value: 1});

        const reason = new Error("boom");
        await expect(task.settle(Promise.reject(reason))).resolves.toEqual({status: "rejected", reason});
    });

    test("tolerant(promise) should swallow rejections", async () => {
        await expect(task.tolerant(Promise.reject(new Error("ignored")))).resolves.toBeUndefined();
    });

    test("all(values) should resolve tuple values", async () => {
        await expect(task.all([Promise.resolve(1), "x"] as const)).resolves.toEqual([1, "x"]);
    });
});
