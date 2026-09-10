import {isXEqualToY} from "@typesec/the/test";
import {beforeEach, describe, expect, test} from "bun:test";
import {
    PendingError,
    PendingService,
    ServiceRef,
    type ServiceState,
    type ServiceStateKnonwn,
    type ServiceStateKnown,
    type ServiceStateResolved,
} from "./index.mjs";
import {define, locator, resolve, service, state, sync, syncArray, unload} from "./service/fn.mjs";
import {TestService} from "./test/TestService.mjs";
import {TestService2} from "./test/TestService2.mjs";

const MyServiceDef = define("MyServiceDef", () => new TestService());
service(TestService2, async () => new TestService2());
service(TestService, async () => new TestService());

describe("Service", () => {
    beforeEach(() => unload(TestService));
    beforeEach(() => unload(TestService2));

    test("define", async () => {
        const stage1 = state(MyServiceDef);
        expect(stage1.resolved).toBeFalse();

        const value1 = await resolve(MyServiceDef);
        const stage2 = state(MyServiceDef);
        expect(stage2.resolved).toBeTrue();
        expect(stage2.resolved === true ? stage2.instance : null).toBeInstanceOf(TestService);

        const value2 = await resolve(MyServiceDef);
        expect(value1.randomNumber).toBe(value2.randomNumber);
    });

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

describe("Service exports", () => {
    test("the package root exposes the types its public API refers to", () => {
        // `service()` returns a ServiceRef and `locator` catches a PendingError, so a consumer has
        // to be able to name both.
        expect(ServiceRef.is(define("MyExportedDef", () => new TestService()))).toBeTrue();
        expect(
            new PendingService(
                define("MyPendingDef", () => new TestService()),
                new TestService(),
            ),
        ).toBeInstanceOf(PendingError);
    });

    test("the misspelled state alias still resolves to the same type", () => {
        expect(isXEqualToY<ServiceStateKnonwn, ServiceStateKnown>(true)).toBeTrue();
        expect(
            isXEqualToY<ServiceState<TestService>, ServiceStateKnown | ServiceStateResolved<TestService>>(true),
        ).toBeTrue();
    });
});
