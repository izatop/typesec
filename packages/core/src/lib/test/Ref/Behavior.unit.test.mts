import {expect, expectTypeOf, test} from "bun:test";
import {Ref, type RefState} from "../../Ref.mjs";

test("ensure()", async () => {
    const ref = new Ref(() => Math.random());
    expectTypeOf(ref.ensure()).toEqualTypeOf<number>();
    expect(ref.ensure()).toBeTypeOf("number");
    expect(ref.ensure()).toBe(ref.ensure());
});

test("async factory is shared while pending and replaced with its resolved value", async () => {
    const pending = Promise.withResolvers<number>();
    let calls = 0;
    const ref = new Ref(() => {
        calls += 1;

        return pending.promise;
    });
    expect(ref.persisted).toBe(false);
    expect(ref.ensure()).toBe(pending.promise);
    expect(ref.ensure()).toBe(pending.promise);
    expect(ref.persisted).toBe(true);
    expect(ref.ref).toEqual<RefState<number>>({state: "pending", value: pending.promise});
    expectTypeOf(ref.ensure()).toEqualTypeOf<number | Promise<number>>();
    expectTypeOf(ref.ref).toEqualTypeOf<RefState<number>>();
    expect(calls).toBe(1);

    pending.resolve(42);
    await pending.promise;
    expect(ref.persisted).toBe(true);
    expect(ref.ref).toEqual<RefState<number>>({state: "persisted", value: 42});
    expect(ref.ensure()).toBe(42);
    expect(calls).toBe(1);
});

test("async factory rejection replaces the pending value with a cached error", async () => {
    const error = new TypeError("getaddrinfo ENOTFOUND vr.vrauth");
    let calls = 0;
    const ref = new Ref(async () => {
        calls += 1;
        throw error;
    });
    await expect(ref.ensure()).rejects.toBe(error);

    expect(ref.ref).toEqual({state: "error", error});
    expect(ref.persisted).toBe(false);
    expect(() => ref.ensure()).toThrow(error);
    expect(() => ref.ensure()).toThrow(error);
    expect(calls).toBe(1);
});

test("update replaces a persisted value with an async error and can recover", async () => {
    const error = new Error("refresh failed");
    let calls = 0;
    const ref = new Ref(async () => {
        calls += 1;
        if (calls === 2) throw error;

        return calls;
    });
    expect(await ref.ensure()).toBe(1);

    ref.update();
    await expect(ref.ensure()).rejects.toBe(error);
    expect(ref.persisted).toBe(false);
    expect(() => ref.ensure()).toThrow(error);

    ref.update();
    expect(await ref.ensure()).toBe(3);
    expect(ref.persisted).toBe(true);
    expect(ref.ref).toEqual<RefState<number>>({state: "persisted", value: 3});
});

test("replace tracks a pending promise and its rejection", async () => {
    const pending = Promise.withResolvers<number>();
    const error = new Error("replacement failed");
    const ref = new Ref<number | Promise<number>>(() => 1);
    expect(ref.ensure()).toBe(1);

    ref.replace(pending.promise);
    expect(ref.persisted).toBe(true);
    expect(ref.ref).toEqual<RefState<number>>({state: "pending", value: pending.promise});
    expect(ref.ensure()).toBe(pending.promise);

    pending.reject(error);
    await expect(pending.promise).rejects.toBe(error);
    expect(ref.persisted).toBe(false);
    expect(ref.ref).toEqual<RefState<number>>({state: "error", error});
    expect(() => ref.ensure()).toThrow(error);
});

for (const outcome of ["resolve", "reject"] as const) {
    test(`an outdated pending ${outcome} cannot overwrite a replacement`, async () => {
        const pending = Promise.withResolvers<number>();
        const ref = new Ref(() => pending.promise);
        expect(ref.ensure()).toBe(pending.promise);
        ref.replace(42);

        if (outcome === "resolve") {
            pending.resolve(1);
            await pending.promise;
        } else {
            const error = new Error("outdated failure");
            pending.reject(error);
            await expect(pending.promise).rejects.toBe(error);
        }

        expect(ref.ref).toEqual<RefState<number>>({state: "persisted", value: 42});
        expect(ref.ensure()).toBe(42);
    });
}

test("PromiseLike factory results become pending native promises", async () => {
    const ref = new Ref<PromiseLike<number>>(() => ({
        then: (resolve, reject) => Promise.resolve(42).then(resolve, reject),
    }));
    const result = ref.ensure();
    expectTypeOf(result).toEqualTypeOf<number | Promise<number>>();
    expect(result).toBeInstanceOf(Promise);
    expect(ref.persisted).toBe(true);
    expect(ref.ref).toEqual<RefState<number>>({state: "pending", value: result as Promise<number>});
    expect(await result).toBe(42);
    expect(ref.ref).toEqual<RefState<number>>({state: "persisted", value: 42});
});

test("replace clears an error produced by an async factory", async () => {
    const error = new Error("factory failed");
    const ref = new Ref<number | Promise<number>>(async () => {
        throw error;
    });
    await expect(ref.ensure()).rejects.toBe(error);

    ref.replace(42);
    expect(ref.persisted).toBe(true);
    expect(ref.ensure()).toBe(42);
});
