import {beforeEach, describe, expect, test} from "bun:test";
import {PendingError, ServiceRef} from "./service/index.mjs";
import {define, ensureRef, locator, resolve, service, state, sync, syncArray, unload} from "./service/fn.mjs";
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

    test("sync throws an awaitable PendingError while the service is unbuilt", async () => {
        let pending: unknown;

        try {
            sync(TestService);
        } catch (reason) {
            pending = reason;
        }

        expect(pending).toBeInstanceOf(PendingError);
        expect(await (pending as PendingError<TestService>)).toBe(sync(TestService));
    });

    test("ServiceRef.is", () => {
        expect(ServiceRef.is(MyServiceDef)).toBeTrue();
        expect(ServiceRef.is(TestService)).toBeFalse();
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

describe("Service registration", () => {
    class Connection {
        public readonly disposed: string[] = [];

        constructor(public readonly label: string) {}

        [Symbol.dispose]() {
            this.disposed.push(this.label);
        }
    }

    test("should address the latest registration by class and each registration by its ref", async () => {
        const first = service(Connection, () => new Connection("first"));
        const second = service(Connection, () => new Connection("second"));

        expect(ensureRef(Connection)).toBe(second);
        expect((await resolve(Connection)).label).toBe("second");
        expect(await resolve(Connection)).toBe(await resolve(second));
        expect((await resolve(first)).label).toBe("first");
        expect(sync(first)).toBe(await resolve(first));
    });

    test("should unload one registration without touching the other", async () => {
        const first = service(Connection, () => new Connection("first"));
        const second = service(Connection, () => new Connection("second"));
        const [old, latest] = await resolve(first, second);

        await unload(first);

        expect(old.disposed).toEqual(["first"]);
        expect(latest.disposed).toEqual([]);
        expect(state(first).resolved).toBeFalse();
        expect(state(Connection).resolved).toBeTrue();
        expect(await resolve(first)).not.toBe(old);
    });

    test("should report a ref it never registered as unknown", async () => {
        const foreign = new ServiceRef(Connection);

        expect(state(foreign)).toEqual({known: false, resolved: false});
        await expect(resolve(foreign)).rejects.toThrow("Unknown service");
        expect(() => state(class Unknown {})).toThrow("Unknown service reference");
    });
});
