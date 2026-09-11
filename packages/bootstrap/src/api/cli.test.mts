import {expect, test} from "bun:test";
import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";

const bin = path.resolve(import.meta.dir, "../../bin/typesec-api");

async function run(cwd: string, ...args: string[]): Promise<string> {
    const proc = Bun.spawn(["bun", bin, ...args], {cwd, stdout: "pipe", stderr: "pipe"});
    const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    await proc.exited;

    return out + err;
}

/**
 * A project that consumes TypeSec as a submodule runs this bin from outside any checkout, so it has
 * to find the checkout it belongs to rather than expecting one around the working directory.
 */
test("resolves the checkout when run from outside one", async () => {
    const outside = await mkdtemp(path.join(tmpdir(), "typesec-api-cli-"));

    try {
        expect(await run(outside, "search", "array.uniq")).toContain("@typesec/the/array");
    } finally {
        await rm(outside, {recursive: true, force: true});
    }
}, 20_000);
