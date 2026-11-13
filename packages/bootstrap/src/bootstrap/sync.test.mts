import {afterEach, beforeEach, describe, expect, test} from "bun:test";
import {mkdtemp, readdir, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {sync, type ScriptChoice, type SyncPrompt} from "./sync.mjs";

const source = path.resolve(import.meta.dir, "../../../..");
const template = path.resolve(import.meta.dir, "../files");
const now = new Date("2026-11-13T10:20:30.000Z");
const stamp = "2026-11-13T10-20-30-000Z";

let target: string;

beforeEach(async () => {
    target = await mkdtemp(path.join(tmpdir(), "typesec-sync-"));
});

afterEach(async () => {
    await rm(target, {recursive: true, force: true});
});

const read = (file: string) => Bun.file(path.join(target, file)).text();
const manifest = async () => JSON.parse(await read("package.json"));
const writeManifest = (value: object) => Bun.write(path.join(target, "package.json"), JSON.stringify(value));

function prompt(files: boolean, scripts: ScriptChoice[] = []): SyncPrompt & {asked: string[]} {
    const asked: string[] = [];

    return {
        asked,
        async replaceFile(file) {
            asked.push(file);

            return files;
        },
        async replaceScript(name) {
            asked.push(name);

            return scripts.shift() ?? "keep";
        },
    };
}

describe("sync", () => {
    test("ships the configuration TypeSec itself uses", async () => {
        const files = await Array.fromAsync(new Bun.Glob("**/*").scan({cwd: template, dot: true}));

        for (const file of files) {
            const own = await Bun.file(path.join(source, file)).text();
            expect(own, file).toBe(await Bun.file(path.join(template, file)).text());
        }
    });

    test("scaffolds an empty project and installs", async () => {
        const installed: string[] = [];
        await writeManifest({name: "app"});

        await sync({target, source, now, install: async (dir) => void installed.push(dir)});

        const result = await manifest();
        const typesec = await Bun.file(path.join(source, "package.json")).json();
        expect(await read("bunfig.toml")).toBe(await Bun.file(path.join(template, "bunfig.toml")).text());
        expect(await read(".vscode/settings.json")).toContain("jkillian.custom-local-formatters");
        expect(result.workspaces.packages).toEqual([`${path.relative(target, source)}/packages/*`]);
        expect(result.workspaces.catalog).toEqual(typesec.workspaces.catalog);
        expect(result.workspaces.catalogs.build).toEqual(typesec.workspaces.catalogs.build);
        expect(result.devDependencies["@typesec/bootstrap"]).toBe("workspace:*");
        expect(result.scripts.lint).toBe("oxlint --quiet");
        expect(installed).toEqual([target]);
    });

    test("fails without a package.json", async () => {
        expect(sync({target, source})).rejects.toThrow("No package.json");
    });

    test("keeps a differing file when the prompt declines", async () => {
        await writeManifest({name: "app"});
        await Bun.write(path.join(target, "bunfig.toml"), "[install]\n");
        const answers = prompt(false);

        await sync({target, source, now, prompt: answers});

        expect(answers.asked).toContain("bunfig.toml");
        expect(await read("bunfig.toml")).toBe("[install]\n");
        expect(await Bun.file(path.join(target, ".backup")).exists()).toBeFalse();
    });

    test("backs up a replaced file and ignores the backups", async () => {
        await writeManifest({name: "app"});
        await Bun.write(path.join(target, "bunfig.toml"), "[install]\n");
        await Bun.write(path.join(target, ".gitignore"), "dist/");

        await sync({target, source, now, prompt: prompt(true)});

        expect(await read(`.backup/${stamp}/bunfig.toml`)).toBe("[install]\n");
        expect(await read("bunfig.toml")).toBe(await Bun.file(path.join(template, "bunfig.toml")).text());
        expect(await read(".gitignore")).toContain("/.backup/");
        expect(await readdir(path.join(target, ".backup", stamp))).toContain(".gitignore");
    });

    test("keeps differing files and scripts without a prompt", async () => {
        await writeManifest({name: "app", scripts: {lint: "eslint ."}});
        await Bun.write(path.join(target, "bunfig.toml"), "[install]\n");

        await sync({target, source, now});

        expect((await manifest()).scripts.lint).toBe("eslint .");
        expect(await read("bunfig.toml")).toBe("[install]\n");
    });

    test("replaces every later script after replace all", async () => {
        await writeManifest({name: "app", scripts: {check: "tsc", test: "jest", lint: "eslint ."}});
        const answers = prompt(false, ["keep", "all"]);

        await sync({target, source, now, prompt: answers});

        const {scripts} = await manifest();
        expect(answers.asked.filter((name) => !name.includes("."))).toEqual(["check", "test"]);
        expect(scripts.check).toBe("tsc");
        expect(scripts.test).toBe("bun test");
        expect(scripts.lint).toBe("oxlint --quiet");
    });

    test("leaves pinned catalog entries and an up-to-date package.json alone", async () => {
        await writeManifest({name: "app"});
        await sync({target, source, now});
        const logs: string[] = [];
        const first = await manifest();
        first.workspaces.catalog.zod = "3.0.0";
        await Bun.write(path.join(target, "package.json"), JSON.stringify(first));
        const written = await read("package.json");

        await sync({target, source, now, log: (line) => logs.push(line)});

        expect(await read("package.json")).toBe(written);
        expect(logs.some((line) => line.startsWith("catalog: kept zod@3.0.0"))).toBeTrue();
    });
});
