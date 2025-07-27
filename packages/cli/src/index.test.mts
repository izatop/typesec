import {getApplication} from "@typesec/unit";
import {expect, test} from "bun:test";
import {resolve} from "node:path";
import {testContext} from "./test/index.mjs";

test("cli", async () => {
    process.argv.push("/test");

    const path = resolve(import.meta.dirname, "test/app");
    const app = getApplication(await import("./test/index.mjs"));

    expect(testContext.count).toBe(0);

    await app.proto.run({path});

    expect(testContext.count).toBe(1);
});
