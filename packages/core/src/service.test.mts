import {beforeEach, describe, expect, test} from "bun:test";
import {locator, resolve, service, state, sync, syncArray, unload} from "./service/fn.mjs";
import {TestService} from "./test/TestService.mjs";
import {TestService2} from "./test/TestService2.mjs";

service(TestService, async () => new TestService());
service(TestService2, async () => new TestService2());

describe("Service", () => {
    beforeEach(() => unload(TestService));
    beforeEach(() => unload(TestService2));

    test("state", async () => {
        const stage1 = state(TestService);
        expect(stage1.known).toBeTrue();
        expect(stage1.resolved).toBeFalse();

        await resolve(TestService);
        const stage2 = state(TestService);
        expect(stage2.known).toBeTrue();
        expect(stage2.resolved).toBeTrue();
        expect(stage2.resolved === true ? stage2.instance : null).toBeInstanceOf(TestService);
    });

    test("sync", async () => {
        expect(state(TestService).resolved).toBeFalse();

        const instance = await locator(function serviceLocate(): TestService {
            const service = sync(TestService);

            return service;
        });

        expect(instance).toBeInstanceOf(TestService);
        expect(instance).toBe(sync(TestService));
        expect(instance.randomNumber).toBe(sync(TestService).randomNumber);
    });

    test("resolve", async () => {
        expect(state(TestService).resolved).toBeFalse();

        const instance = await resolve(TestService);
        expect(instance).toBeInstanceOf(TestService);
    });

    test("syncArray", async () => {
        await locator(function serviceLocate() {
            const [s1, s2] = syncArray(TestService, TestService2);
            expect(s1).toBeInstanceOf(TestService);
            expect(s2).toBeInstanceOf(TestService2);
        });
    });
});
