import {describe, expect, mock, test} from "bun:test";

import {isXEqualToY} from "@typesec/the/test";

import {RuntimeClosedException, RuntimeController} from "../../index.mjs";

describe("RuntimeController tracked work", () => {
    test("types", async () => {
        const controller = RuntimeController.clone();

        try {
            const sync = controller.track(() => 1);
            const async = controller.track(async () => "a");
            const nested = controller.track(() => controller.track(() => true));

            expect(isXEqualToY<typeof sync, Promise<number>>(true)).toBeTrue();
            expect(isXEqualToY<typeof async, Promise<string>>(true)).toBeTrue();
            expect(isXEqualToY<typeof nested, Promise<boolean>>(true)).toBeTrue();
        } finally {
            await controller.close();
        }
    });

    test("should return synchronous results and leave the controller open for more work", async () => {
        const controller = RuntimeController.clone();

        try {
            const first = controller.track(() => 21);
            const second = controller.track(() => 42);

            expect(await first).toBe(21);
            expect(await second).toBe(42);
            expect(controller.signal.aborted).toBeFalse();
        } finally {
            await controller.close();
        }
    });

    test("should start work synchronously and retain resources until it settles", async () => {
        const controller = RuntimeController.clone();
        const {promise: gate, resolve: release} = Promise.withResolvers<number>();
        const order: string[] = [];
        let settled = false;

        controller.defer(() => {
            order.push("cleanup");
        });

        const result = controller.track(() => {
            order.push("work:start");

            return gate.then((value) => {
                order.push("work:end");

                return value;
            });
        });

        const pending = controller.close();
        const observed = pending.then(() => {
            settled = true;
        });

        try {
            expect(order).toEqual(["work:start"]);

            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(settled).toBeFalse();
            expect(order).toEqual(["work:start"]);
        } finally {
            release(42);

            await observed;
        }

        expect(await result).toBe(42);
        expect(order).toEqual(["work:start", "work:end", "cleanup"]);
        expect(controller.close()).toBe(pending);
    });

    test("should await work whose callback closes its own controller synchronously", async () => {
        const controller = RuntimeController.clone();
        const {promise: gate, resolve: release} = Promise.withResolvers<void>();
        const cleanup = mock(() => void 0);
        let pending: Promise<void> | undefined;
        let settled = false;

        controller.defer(cleanup);

        const result = controller.track(() => {
            pending = controller.close();

            return gate;
        });

        const observed = controller.close().then(() => {
            settled = true;
        });

        try {
            expect(controller.signal.aborted).toBeTrue();
            expect(pending).toBe(controller.close());

            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(settled).toBeFalse();
            expect(cleanup).not.toHaveBeenCalled();
        } finally {
            release();

            await result;
            await observed;
        }

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("should preserve nested work results without stranding either registration", async () => {
        const controller = RuntimeController.clone();
        const {promise: gate, resolve: release} = Promise.withResolvers<string>();
        const cleanup = mock(() => void 0);
        const started: string[] = [];

        controller.defer(cleanup);

        const result = controller.track(() => {
            started.push("outer");

            return controller.track(() => {
                started.push("inner");

                return gate;
            });
        });

        const pending = controller.close();

        try {
            expect(started).toEqual(["outer", "inner"]);

            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(cleanup).not.toHaveBeenCalled();
        } finally {
            release("done");

            await pending;
        }

        expect(await result).toBe("done");
        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("should return body failures to callers without failing cleanup", async () => {
        const controller = RuntimeController.clone();
        const reason = new Error("Tracked work failed");
        const {promise: gate, reject} = Promise.withResolvers<void>();
        const cleanup = mock(() => void 0);

        controller.defer(cleanup);

        const synchronous = controller.track(() => {
            throw reason;
        });

        const asynchronous = controller.track(() => gate);
        const syncFailure = synchronous.catch((error: unknown) => error);
        const asyncFailure = asynchronous.catch((error: unknown) => ({error}));

        const pending = controller.close();

        try {
            expect(await syncFailure).toBe(reason);

            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(cleanup).not.toHaveBeenCalled();
        } finally {
            reject(undefined);

            await pending;
        }

        expect(await asyncFailure).toEqual({error: undefined});
        expect(cleanup).toHaveBeenCalledTimes(1);
        await expect(controller.close()).resolves.toBeUndefined();
    });

    test("should leave a dropped body failure unhandled instead of swallowing it", () => {
        // The test runner reports unhandled rejections itself, so observe one in a child process.
        const module = `${import.meta.dir}/../../index.mts`;
        const script = `
            import {RuntimeController} from ${JSON.stringify(module)};

            process.on("unhandledRejection", (error) => {
                console.log(error.message);
                process.exit(0);
            });

            void RuntimeController.clone().track(async () => {
                throw new Error("dropped");
            });

            setTimeout(() => process.exit(1), 1000);
        `;

        const result = Bun.spawnSync({cmd: [process.execPath, "-e", script], stdout: "pipe", stderr: "pipe"});

        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString().trim()).toBe("dropped");
    });

    test("should refuse work during and after closure without invoking its callback", async () => {
        const controller = RuntimeController.clone();
        const {promise: gate, resolve: release} = Promise.withResolvers<void>();
        const callback = mock(() => 42);
        let failure: unknown;

        controller.defer(() => gate);

        const pending = controller.close();

        try {
            try {
                controller.track(callback);
            } catch (error) {
                failure = error;
            }

            expect(failure).toBeInstanceOf(RuntimeClosedException);
            expect((failure as RuntimeClosedException).controller).toBe(controller);
            expect(controller.close()).toBe(pending);
            expect(callback).not.toHaveBeenCalled();
        } finally {
            release();

            await pending;
        }

        expect(() => controller.track(callback)).toThrow(RuntimeClosedException);
        expect(callback).not.toHaveBeenCalled();
        expect(controller.close()).toBe(pending);
    });
});
