import {mkdir, rename} from "node:fs/promises";
import path from "node:path";

import {findRoot} from "../api/workspace.mjs";
import {unifiedDiff} from "./diff.mjs";
import {migrateFiles} from "./migrations.mjs";
import {mergeVscodeSettings} from "./vscode.mjs";

/**
 * Answer to a script that the project defines differently: keep it, replace it, or replace it and
 * every later one without asking again.
 * @category tooling
 */
export type ScriptChoice = "keep" | "replace" | "all";

/**
 * The questions `sync` asks before it overwrites anything the project already has.
 *
 * Without one, `sync` keeps differing files and scripts, except automatic settings and file migrations.
 * @category tooling
 */
export type SyncPrompt = {
    /** Shown the diff from the project's file to the template; true replaces the file. */
    replaceFile(file: string, diff: string): Promise<boolean>;
    replaceScript(name: string, current: string, proposed: string): Promise<ScriptChoice>;
    /** TypeSec stopped shipping this script in favour of `replacement`; true removes it. */
    removeScript(name: string, current: string, replacement: string): Promise<boolean>;
    /** TypeSec replaced this package with `replacement`; true removes it and its catalog entries. */
    removeDependency(name: string, replacement: string): Promise<boolean>;
};

/**
 * Where `sync` works and how it talks to the person running it.
 * @category tooling
 */
export type SyncOptions = {
    /** The project directory, holding its root `package.json`. */
    target: string;
    /**
     * The TypeSec checkout whose catalog the project receives; found from this module when omitted.
     * It has to be the project itself or sit in the project's `vendor/`.
     */
    source?: string;
    prompt?: SyncPrompt;
    /** Runs after `package.json` is written; `bun install` in the CLI, omitted to skip installing. */
    install?: (target: string) => Promise<void>;
    log?: (line: string) => void;
    /** Names the backup directory; the current time when omitted. */
    now?: Date;
};

type Catalog = Record<string, string>;

type Manifest = {
    workspaces?: string[] | {packages?: string[]; catalog?: Catalog; catalogs?: Record<string, Catalog>};
    catalog?: Catalog;
    catalogs?: Record<string, Catalog>;
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
    [key: string]: unknown;
};

const TEMPLATE = path.resolve(import.meta.dir, "../files");

const BACKUP = ".backup";

/** Where the packages of the submodules in `vendor/` live, at any depth. */
const VENDOR = "vendor/*/packages/**";

const SCRIPTS: Record<string, string> = {
    check: "bun check -b -p packages",
    "check:tsc": "bun tsc -b packages",
    "check:tsc:watch": "bun tsc -b packages -w",
    test: "bun test",
    "test:watch": "bun --watch test",
    "test:coverage": "bun test --coverage --coverage-reporter=text --coverage-reporter=lcov",
    audit: "bun audit --audit-level=high",
    lint: "oxlint --quiet",
    "fmt:check": "bun fmt --check",
    sync: "bun typesec sync",
    up: "bun update -ri --latest",
};

const DEV_DEPENDENCIES: Record<string, string> = {
    "@types/bun": "catalog:",
    "@typesec/bootstrap": "workspace:*",
    oxlint: "catalog:build",
    typescript: "catalog:build",
};

/** Scripts earlier versions of TypeSec added, by the script that took their place. */
const OBSOLETE_SCRIPTS: Record<string, string> = {
    "check:watch": "check:tsc:watch",
};

/** Dev dependencies earlier versions of TypeSec added, by the package that took their place. */
const OBSOLETE_DEPENDENCIES: Record<string, string> = {
    "@typescript/native-preview": "typescript",
};

/**
 * Brings a project that consumes TypeSec in line with it: configuration files, catalog entries,
 * workspace globs, dev dependencies and scripts.
 *
 * Missing pieces are added. A file or script the project has in a different form is replaced only
 * when the prompt agrees, and a replaced file is moved to `.backup/<time>/` first. A script or dev
 * dependency that TypeSec stopped shipping is removed only when the prompt agrees. Catalog entries
 * and dependencies the project already pins are never changed otherwise.
 * VS Code settings are merged automatically, with template values winning and obsolete keys removed.
 * File migrations automatically remove known obsolete lines, backing up changed or deleted files.
 * @category tooling
 */
export async function sync(options: SyncOptions): Promise<void> {
    const target = path.resolve(options.target);
    const source = options.source ?? (await findRoot(import.meta.dir));
    const log = options.log ?? (() => {});
    const manifestFile = Bun.file(path.join(target, "package.json"));

    if (!(await manifestFile.exists())) {
        throw new Error(`No package.json in ${target}: run sync from the project root.`);
    }

    const submodule = path.relative(target, source).split(path.sep).join("/");

    if (submodule !== "" && !/^vendor\/[^/]+$/.test(submodule)) {
        throw new Error(
            `TypeSec has to sit in vendor/ of the project, such as vendor/typesec, not in ${submodule}.\n` +
                `Move the submodule there and run sync again.`,
        );
    }

    await syncFiles(target, options.now ?? new Date(), options.prompt, log);

    const manifest: Manifest = await manifestFile.json();
    const before = JSON.stringify(manifest);
    const typesec: Manifest = await Bun.file(path.join(source, "package.json")).json();

    syncWorkspaces(manifest, log);
    syncCatalogs(manifest, typesec, log);
    await removeDependencies(manifest, options.prompt, log);
    syncDependencies(manifest, log);
    await removeScripts(manifest, options.prompt, log);
    await syncScripts(manifest, scriptsFor(submodule), options.prompt, log);

    if (JSON.stringify(manifest) !== before) {
        await Bun.write(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
        await format(target, log);
        log("package.json: updated");
    }

    await options.install?.(target);
}

async function syncFiles(target: string, now: Date, prompt: SyncPrompt | undefined, log: (line: string) => void) {
    const backup = path.join(target, BACKUP, now.toISOString().replace(/[:.]/g, "-"));
    let backedUp = false;

    for await (const file of new Bun.Glob("**/*").scan({cwd: TEMPLATE, dot: true})) {
        if (file === ".vscode/settings-deletions.json") continue;

        let template = await Bun.file(path.join(TEMPLATE, file)).text();
        const existing = Bun.file(path.join(target, file));
        const exists = await existing.exists();
        const current = exists ? await existing.text() : "";
        const settings = file === ".vscode/settings.json";

        if (settings) {
            const deletions = await Bun.file(path.join(TEMPLATE, ".vscode/settings-deletions.json")).text();

            template = mergeVscodeSettings(exists ? current : "{}", template, deletions);
        }

        if (!exists) {
            await Bun.write(existing, template);
            log(`${file}: created`);
            continue;
        }

        if (current === template) continue;

        if (!settings) {
            const diff = unifiedDiff(current, template, [`project/${file}`, `typesec/${file}`]);

            if (!(await prompt?.replaceFile(file, diff))) {
                log(`${file}: differs from the template, kept`);
                continue;
            }
        }

        await mkdir(path.dirname(path.join(backup, file)), {recursive: true});
        await rename(path.join(target, file), path.join(backup, file));
        await Bun.write(path.join(target, file), template);
        backedUp = true;
        log(
            `${file}: ${settings ? "merged" : "replaced"}, previous version in ${path.relative(target, path.join(backup, file))}`,
        );
    }

    const migrated = await migrateFiles(target, backup, log);

    if (backedUp || migrated) await ignoreBackups(target, log);
}

/** Keeps `.backup/` out of Git even when the project kept its own `.gitignore`. */
async function ignoreBackups(target: string, log: (line: string) => void) {
    const file = Bun.file(path.join(target, ".gitignore"));
    const current = (await file.exists()) ? await file.text() : "";
    const entries = current.split("\n").map((line) => line.trim());

    if (entries.some((line) => [BACKUP, `${BACKUP}/`, `/${BACKUP}`, `/${BACKUP}/`].includes(line))) return;

    const separator = current === "" || current.endsWith("\n") ? "" : "\n";
    await Bun.write(file, `${current}${separator}/${BACKUP}/\n`);
    log(`.gitignore: added /${BACKUP}/`);
}

/** The workspaces as an object, converting the short array form once something has to be added. */
function workspacesOf(manifest: Manifest): Exclude<Manifest["workspaces"], string[] | undefined> {
    if (Array.isArray(manifest.workspaces) || !manifest.workspaces) {
        manifest.workspaces = {packages: manifest.workspaces ?? []};
    }

    return manifest.workspaces;
}

/**
 * Leaves `package.json` the way the project's own `fmt:check` expects it, key order included:
 * the keys sync adds land wherever they were created.
 */
async function format(target: string, log: (line: string) => void) {
    const proc = Bun.spawn(["bun", "fmt", "--no-script", "package.json"], {
        cwd: target,
        stdout: "ignore",
        stderr: "ignore",
    });

    if ((await proc.exited) !== 0) log("package.json: bun fmt could not format it");
}

/**
 * The scripts the project receives. Inside a project `typesec api` indexes that project, so one
 * that holds TypeSec as a submodule also gets `typesec:api`, pointed at the submodule.
 */
function scriptsFor(submodule: string): Record<string, string> {
    return submodule === "" ? SCRIPTS : {...SCRIPTS, "typesec:api": `typesec api --root ${submodule}`};
}

/** The packages of every submodule in `vendor/` become workspaces of the project, TypeSec among them. */
function syncWorkspaces(manifest: Manifest, log: (line: string) => void) {
    const listed = Array.isArray(manifest.workspaces) ? manifest.workspaces : manifest.workspaces?.packages;
    if (listed?.includes(VENDOR)) return;

    const workspaces = workspacesOf(manifest);
    workspaces.packages = [...(workspaces.packages ?? []), VENDOR];
    log(`workspaces: added ${VENDOR}`);
}

/** TypeSec's packages name their dependencies through `catalog:`, which resolves against the project. */
function syncCatalogs(manifest: Manifest, typesec: Manifest, log: (line: string) => void) {
    const from = typesec.workspaces && !Array.isArray(typesec.workspaces) ? typesec.workspaces : {};
    const own = () => (Array.isArray(manifest.workspaces) ? undefined : manifest.workspaces);

    const missing = missingEntries("catalog", from.catalog, own()?.catalog, manifest.catalog, log);
    if (missing) {
        const workspaces = workspacesOf(manifest);
        workspaces.catalog = {...workspaces.catalog, ...missing};
    }

    for (const [name, catalog] of Object.entries(from.catalogs ?? {})) {
        const added = missingEntries(
            `catalogs.${name}`,
            catalog,
            own()?.catalogs?.[name],
            manifest.catalogs?.[name],
            log,
        );
        if (!added) continue;

        const workspaces = workspacesOf(manifest);
        workspaces.catalogs = {...workspaces.catalogs, [name]: {...workspaces.catalogs?.[name], ...added}};
    }
}

/** The entries of TypeSec's catalog the project lacks; a version the project pins is left alone. */
function missingEntries(
    label: string,
    typesec: Catalog | undefined,
    own: Catalog | undefined,
    topLevel: Catalog | undefined,
    log: (line: string) => void,
): Catalog | undefined {
    const missing: Catalog = {};

    for (const [name, version] of Object.entries(typesec ?? {})) {
        const pinned = own?.[name] ?? topLevel?.[name];

        if (pinned === undefined) {
            missing[name] = version;
            log(`${label}: added ${name}@${version}`);
        } else if (pinned !== version) {
            log(`${label}: kept ${name}@${pinned}, TypeSec uses ${version}`);
        }
    }

    return Object.keys(missing).length > 0 ? missing : undefined;
}

/** Every catalog the manifest holds, at the top level and under `workspaces`. */
function catalogsOf(manifest: Manifest): Catalog[] {
    const workspaces = Array.isArray(manifest.workspaces) ? undefined : manifest.workspaces;
    const groups = [manifest.catalogs, workspaces?.catalogs].flatMap((catalogs) => Object.values(catalogs ?? {}));

    return [manifest.catalog, workspaces?.catalog, ...groups].filter((catalog) => catalog !== undefined);
}

/** Offers to drop a dev dependency TypeSec replaced, with the catalog entries that pinned it. */
async function removeDependencies(manifest: Manifest, prompt: SyncPrompt | undefined, log: (line: string) => void) {
    for (const [name, replacement] of Object.entries(OBSOLETE_DEPENDENCIES)) {
        const catalogs = catalogsOf(manifest).filter((catalog) => catalog[name] !== undefined);
        if (manifest.devDependencies?.[name] === undefined && catalogs.length === 0) continue;

        if (!(await prompt?.removeDependency(name, replacement))) {
            log(`devDependencies: kept ${name}, TypeSec replaced it with ${replacement}`);
            continue;
        }

        delete manifest.devDependencies?.[name];
        for (const catalog of catalogs) delete catalog[name];
        log(`devDependencies: removed ${name}, replaced by ${replacement}`);
    }
}

function syncDependencies(manifest: Manifest, log: (line: string) => void) {
    const dependencies = (manifest.devDependencies ??= {});

    for (const [name, version] of Object.entries(DEV_DEPENDENCIES)) {
        if (dependencies[name] !== undefined) continue;

        dependencies[name] = version;
        log(`devDependencies: added ${name}@${version}`);
    }
}

/** Offers to drop a script TypeSec replaced; the project may have changed it, so the prompt sees it. */
async function removeScripts(manifest: Manifest, prompt: SyncPrompt | undefined, log: (line: string) => void) {
    const scripts = manifest.scripts ?? {};

    for (const [name, replacement] of Object.entries(OBSOLETE_SCRIPTS)) {
        const current = scripts[name];
        if (current === undefined) continue;

        if (!(await prompt?.removeScript(name, current, replacement))) {
            log(`scripts: kept ${name} (${current}), TypeSec replaced it with ${replacement}`);
            continue;
        }

        delete scripts[name];
        log(`scripts: removed ${name}, replaced by ${replacement}`);
    }
}

async function syncScripts(
    manifest: Manifest,
    wanted: Record<string, string>,
    prompt: SyncPrompt | undefined,
    log: (line: string) => void,
) {
    const scripts = (manifest.scripts ??= {});
    let replaceAll = false;

    for (const [name, command] of Object.entries(wanted)) {
        const current = scripts[name];
        if (current === command) continue;

        if (current === undefined) {
            scripts[name] = command;
            log(`scripts: added ${name}`);
            continue;
        }

        const choice: ScriptChoice = replaceAll
            ? "all"
            : ((await prompt?.replaceScript(name, current, command)) ?? "keep");
        if (choice === "keep") {
            log(`scripts: kept ${name} (${current})`);
            continue;
        }

        replaceAll = choice === "all";
        scripts[name] = command;
        log(`scripts: replaced ${name}`);
    }
}
