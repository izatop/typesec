import {expect, expectTypeOf, test} from "bun:test";
import type {Promisify} from "@typesec/the";
import {PersistCache} from "../../PersistCache.mjs";

async function* refresh() {
    yield undefined;
}

test("sync updater returns a synchronous value", () => {
    const cache = new PersistCache(() => 42);
    const result = cache.ensure();
    expectTypeOf(result).toEqualTypeOf<number>();
    expect(result).toBe(42);
    expect(cache.isPersisted()).toBe(true);
    expect(cache.ensure()).toBe(42);
});

test("PromiseLike updater returns a pending Promise and then a synchronous value", async () => {
    const cache = PersistCache.create<PromiseLike<number>>(() => ({
        then: (resolve, reject) => Promise.resolve(42).then(resolve, reject),
    }));
    const result = cache.ensure();
    expectTypeOf(result).toEqualTypeOf<number | Promise<number>>();
    expect(result).toBeInstanceOf(Promise);
    expect(cache.isPersisted()).toBe(true);
    expect(await result).toBe(42);
    expect(cache.ensure()).toBe(42);
});

test("mixed updater preserves the synchronous or asynchronous return type", async () => {
    const cache = new PersistCache<Promisify<number>>(() => 42);
    const result = cache.ensure();
    expectTypeOf(result).toEqualTypeOf<number | Promise<number>>();
    expect(result).toBe(42);
});

test("a pending factory is persisted and shared by concurrent ensure calls", async () => {
    const pending = Promise.withResolvers<number>();
    let calls = 0;
    const cache = new PersistCache(() => {
        calls += 1;

        return pending.promise;
    });
    expect(cache.isPersisted()).toBe(false);
    const first = cache.ensure();
    const second = cache.ensure();
    expectTypeOf(first).toEqualTypeOf<number | Promise<number>>();
    expect(first).toBe(pending.promise);
    expect(second).toBe(first);
    expect(cache.isPersisted()).toBe(true);
    expect(calls).toBe(1);

    pending.resolve(42);
    expect(await first).toBe(42);
    expect(await second).toBe(42);
    expect(cache.isPersisted()).toBe(true);
    expect(cache.ensure()).toBe(42);
    expect(calls).toBe(1);
});

test("listen captures an async refresh error without an active ensure caller and can recover", async () => {
    const error = new TypeError("getaddrinfo ENOTFOUND vr.vrauth");
    let calls = 0;
    const cache = new PersistCache(async () => {
        calls += 1;
        if (calls === 2) throw error;

        return calls;
    });
    expect(cache.isPersisted()).toBe(false);
    expect(await cache.ensure()).toBe(1);
    expect(cache.isPersisted()).toBe(true);

    // No consumer awaits the rejected factory promise during the refresh.
    await cache.listen(refresh());
    expect(cache.isPersisted()).toBe(false);
    expect(() => cache.ensure()).toThrow(error);
    expect(() => cache.ensure()).toThrow(error);
    expect(calls).toBe(2);

    await cache.listen(refresh());
    expect(cache.isPersisted()).toBe(true);
    expect(await cache.ensure()).toBe(3);
    expect(calls).toBe(3);
});
