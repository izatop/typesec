import {afterEach, beforeEach, expect, test} from "bun:test";
import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";

const bin = path.resolve(import.meta.dir, "../bin/typesec");

let outside: string;

beforeEach(async () => {
    outside = await mkdtemp(path.join(tmpdir(), "typesec-cli-"));
});

afterEach(async () => {
    await rm(outside, {recursive: true, force: true});
});

async function run(...args: string[]): Promise<string> {
    const proc = Bun.spawn(["bun", bin, ...args], {cwd: outside, stdin: "ignore", stdout: "pipe", stderr: "pipe"});
    const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    await proc.exited;

    return out + err;
}

test("routes api to the index of its own checkout", async () => {
    expect(await run("api", "search", "array.uniq")).toContain("@typesec/the/array");
}, 20_000);

test("routes bootstrap sync, keeping what differs without a terminal", async () => {
    await Bun.write(path.join(outside, "package.json"), JSON.stringify({name: "app", scripts: {lint: "eslint ."}}));

    const output = await run("bootstrap", "sync", "--no-install");

    expect(output).toContain("scripts: kept lint (eslint .)");
    expect(await Bun.file(path.join(outside, "tsconfig.json")).exists()).toBeTrue();
}, 20_000);
