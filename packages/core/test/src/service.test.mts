import {beforeEach, describe, test} from "bun:test";
import assert from "node:assert";
import {locator, resolve, service, state, sync, unload} from "../../src/service/fn.mjs";
import {TestService} from "./service/TestService.mjs";

service(TestService, () => new TestService());

describe("Service", () => {
    beforeEach(() => unload(TestService));

    test("state", async () => {
        const stage1 = state(TestService);
        assert.ok(stage1.known);
        assert.ok(stage1.resolved === false);

        await resolve(TestService);
        const stage2 = state(TestService);
        assert.ok(stage2.known);
        assert.ok(stage2.resolved);
        assert.ok(stage2.instance instanceof TestService);
    });

    test("sync", async () => {
        assert.ok(state(TestService).resolved === false);

        const instance = await locator(() => {
            const service = sync(TestService);

            return service;
        });

        assert.ok(instance instanceof TestService);
        assert.deepEqual(instance, sync(TestService));
        assert.deepEqual(instance.randomNumber, sync(TestService).randomNumber);
    });

    test("resolve", async () => {
        assert.ok(state(TestService).resolved === false);

        const instance = await resolve(TestService);
        assert.ok(instance instanceof TestService);
    });
});
