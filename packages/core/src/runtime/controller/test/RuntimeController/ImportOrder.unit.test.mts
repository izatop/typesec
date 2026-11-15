import {describe, expect, test} from "bun:test";

describe("RuntimeController import order", () => {
    test("should initialize first and refuse a service until the service registry is loaded", () => {
        const script = `
            import {RuntimeController} from ${JSON.stringify(`${import.meta.dir}/../../RuntimeController.mts`)};

            try {
                RuntimeController.clone().service(class Probe {}, () => ({}));
            } catch (reason) {
                console.log(reason.message);
            }

            setImmediate(() => process.exit(0));
        `;

        const result = Bun.spawnSync({
            cmd: [process.execPath, "-e", script],
            stdout: "pipe",
            stderr: "pipe",
            timeout: 5000,
        });

        expect(result.stderr.toString()).toBe("");
        expect(result.stdout.toString()).toBe("service(): the service registry is not loaded; import @typesec/core\n");
        expect(result.exitCode).toBe(0);
    });
});
