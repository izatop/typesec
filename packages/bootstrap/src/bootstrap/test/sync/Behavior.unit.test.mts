import {afterEach, beforeEach, describe, expect, test} from "bun:test";
import {mkdtemp, readdir, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";

import {type ScriptChoice, sync, type SyncPrompt} from "../../sync.mjs";

const checkout = path.resolve(import.meta.dir, "../../../../../..");
const template = path.resolve(import.meta.dir, "../../../files");
const now = new Date("2026-11-13T10:20:30.000Z");
const stamp = "2026-11-13T10-20-30-000Z";

let target: string;
let source: string;

beforeEach(async () => {
    target = await mkdtemp(path.join(tmpdir(), "typesec-sync-"));
    source = path.join(target, "vendor", "typesec");
    await Bun.write(path.join(source, "package.json"), Bun.file(path.join(checkout, "package.json")));
});

afterEach(async () => {
    await rm(target, {recursive: true, force: true});
});

const read = (file: string) => Bun.file(path.join(target, file)).text();
const manifest = async () => JSON.parse(await read("package.json"));
const writeManifest = (value: object) => Bun.write(path.join(target, "package.json"), JSON.stringify(value));

function prompt(files: boolean, scripts: ScriptChoice[] = [], removals = false): SyncPrompt & {asked: string[]} {
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
        async removeScript(name) {
            asked.push(`remove ${name}`);

            return removals;
        },
        async removeDependency(name) {
            asked.push(`remove ${name}`);

            return removals;
        },
    };
}

/** A project set up by the TypeSec that shipped `tsgo`, before `bun check` and `typescript@7`. */
const legacy = () =>
    writeManifest({
        name: "app",
        workspaces: {packages: [], catalogs: {build: {"@typescript/native-preview": "^7.0.0-dev.20260707.2"}}},
        scripts: {check: "bun tsgo -b packages", "check:watch": "bun tsgo -b packages -w"},
        devDependencies: {"@typescript/native-preview": "catalog:build"},
    });

describe("sync", () => {
    test("ships the configuration TypeSec itself uses", async () => {
        const files = await Array.fromAsync(new Bun.Glob("**/*").scan({cwd: template, dot: true}));

        for (const file of files) {
            if (file === ".vscode/settings-deletions.json") continue;

            const own = await Bun.file(path.join(checkout, file)).text();
            expect(own, file).toBe(await Bun.file(path.join(template, file)).text());
        }
    });

    test("ships the scripts TypeSec itself uses", async () => {
        const logs: string[] = [];
        await Bun.write(path.join(target, "package.json"), Bun.file(path.join(checkout, "package.json")));

        await sync({target, source, now, log: (line) => logs.push(line)});

        expect(logs.filter((line) => line.startsWith("scripts:"))).toEqual(["scripts: added typesec:api"]);
        expect(logs.filter((line) => line.startsWith("devDependencies:"))).toEqual([]);
    });

    test("removes an obsolete script and dependency with their catalog entries when the prompt agrees", async () => {
        await legacy();
        const answers = prompt(false, ["replace"], true);

        await sync({target, source, now, prompt: answers});

        const {scripts, devDependencies, workspaces} = await manifest();
        expect(answers.asked).toContain("remove check:watch");
        expect(answers.asked).toContain("remove @typescript/native-preview");
        expect(scripts["check:watch"]).toBeUndefined();
        expect(scripts.check).toBe("bun check -b -p packages");
        expect(scripts["check:tsc:watch"]).toBe("bun tsc -b packages -w");
        expect(devDependencies["@typescript/native-preview"]).toBeUndefined();
        expect(devDependencies.typescript).toBe("catalog:build");
        expect(workspaces.catalogs.build["@typescript/native-preview"]).toBeUndefined();
        expect(workspaces.catalogs.build.typescript).toBeDefined();
    });

    test("keeps an obsolete script and dependency when the prompt declines", async () => {
        await legacy();

        await sync({target, source, now, prompt: prompt(false, ["keep"], false)});

        const {scripts, devDependencies, workspaces} = await manifest();
        expect(scripts["check:watch"]).toBe("bun tsgo -b packages -w");
        expect(devDependencies["@typescript/native-preview"]).toBe("catalog:build");
        expect(workspaces.catalogs.build["@typescript/native-preview"]).toBe("^7.0.0-dev.20260707.2");
    });

    test("removes nothing without a prompt", async () => {
        await legacy();
        const logs: string[] = [];

        await sync({target, source, now, log: (line) => logs.push(line)});

        const {scripts, devDependencies} = await manifest();
        expect(scripts["check:watch"]).toBe("bun tsgo -b packages -w");
        expect(devDependencies["@typescript/native-preview"]).toBe("catalog:build");
        expect(logs).toContain(
            "scripts: kept check:watch (bun tsgo -b packages -w), TypeSec replaced it with check:tsc:watch",
        );
        expect(logs).toContain("devDependencies: kept @typescript/native-preview, TypeSec replaced it with typescript");
    });

    test("scaffolds an empty project and installs", async () => {
        const installed: string[] = [];
        await writeManifest({name: "app"});

        await sync({target, source, now, install: async (dir) => void installed.push(dir)});

        const result = await manifest();
        const typesec = await Bun.file(path.join(checkout, "package.json")).json();
        expect(await read("bunfig.toml")).toBe(await Bun.file(path.join(template, "bunfig.toml")).text());
        expect(await read(".vscode/settings.json")).toContain("jkillian.custom-local-formatters");
        expect(result.workspaces.packages).toEqual(["vendor/*/packages/**"]);
        expect(result.workspaces.catalog).toEqual(typesec.workspaces.catalog);
        expect(result.workspaces.catalogs.build).toEqual(typesec.workspaces.catalogs.build);
        expect(result.devDependencies["@typesec/bootstrap"]).toBe("workspace:*");
        expect(result.scripts.lint).toBe("oxlint --quiet");
        expect(result.scripts["typesec:api"]).toBe("typesec api --root vendor/typesec");
        expect(installed).toEqual([target]);
    });

    test("writes a package.json that passes the project's own format check", async () => {
        await writeManifest({name: "app"});

        await sync({target, source, now});

        const check = Bun.spawn(["bun", "fmt", "--check", "--no-script", "package.json"], {cwd: target});
        expect(await check.exited).toBe(0);
    });

    test("merges VS Code settings without a prompt and backs up the original JSONC", async () => {
        await writeManifest({name: "app"});
        const current =
            '{ // project settings\n "editor.formatOnSave": false, "custom.setting": true, "[sql]": {"editor.tabSize": 4},\n}\n';
        await Bun.write(path.join(target, ".vscode/settings.json"), current);

        await sync({target, source, now});

        const settings = JSON.parse(await read(".vscode/settings.json"));

        expect(settings["editor.formatOnSave"]).toBeTrue();
        expect(settings["custom.setting"]).toBeTrue();
        expect(settings["[sql]"]).toEqual({"editor.tabSize": 4, "editor.defaultFormatter": "sqlfluff.vscode-sqlfluff"});
        expect(await read(`.backup/${stamp}/.vscode/settings.json`)).toBe(current);
        expect(await Bun.file(path.join(target, ".vscode/settings-deletions.json")).exists()).toBeFalse();

        const first = await read(".vscode/settings.json");

        await sync({target, source, now});

        expect(await read(".vscode/settings.json")).toBe(first);
        expect(await read(`.backup/${stamp}/.vscode/settings.json`)).toBe(current);
    });

    test("refuses a TypeSec checkout outside vendor/ before changing anything", async () => {
        await writeManifest({name: "app"});

        await expect(sync({target, source: checkout, now})).rejects.toThrow("has to sit in vendor/");

        expect(await Bun.file(path.join(target, "bunfig.toml")).exists()).toBeFalse();
        expect(await manifest()).toEqual({name: "app"});
    });

    test("adds no typesec:api script to TypeSec itself", async () => {
        await writeManifest({name: "typesec", workspaces: {packages: ["packages/*"]}});

        await sync({target, source: target, now});

        expect((await manifest()).scripts["typesec:api"]).toBeUndefined();
    });

    test("fails without a package.json", async () => {
        await expect(sync({target, source})).rejects.toThrow("No package.json");
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
