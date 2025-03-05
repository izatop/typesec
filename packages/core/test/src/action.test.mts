import * as assert from "node:assert/strict";
import test, {describe} from "node:test";
import {Unit} from "../../src/index.mjs";
import avg from "./action/avg.mjs";
import {CONTEXT_NUM, context} from "./action/context/context.mjs";
import dependsOnContext from "./action/context/dependsOnContext.mjs";
import error from "./action/error.mjs";
import hello from "./action/hello.mjs";

describe("Action", () => {
    test("Test 1", async () => {
        assert.equal(await Unit.run(hello, {name: "World"}), "Hello, World!");
    });

    test("Test 2", async () => {
        assert.equal(await Unit.run(avg, {values: [1, 2, 3]}), 2);
    });

    test("Test 3", async () => {
        await assert.rejects(Unit.run(error, {name: "Error"}));
        assert.equal(await Unit.run(error, {name: "Action"}), "Test, Action!");
    });

    test("Test 4", async () => {
        const plus = Math.random();
        assert.equal(await context.run(dependsOnContext, {plus}), plus + CONTEXT_NUM);
    });
});
