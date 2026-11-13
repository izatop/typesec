import {mkdir, rename} from "node:fs/promises";
import path from "node:path";
import {findRoot} from "../api/workspace.mjs";
import {unifiedDiff} from "./diff.mjs";

/**
 * Answer to a script that the project defines differently: keep it, replace it, or replace it and
 * every later one without asking again.
 * @category tooling
 */
export type ScriptChoice = "keep" | "replace" | "all";

/**
 * The questions `sync` asks before it overwrites anything the project already has.
 *
 * Without one, `sync` runs non-interactively and keeps every file and script that differs.
 * @category tooling
 */
export type SyncPrompt = {
    /** Shown the diff from the project's file to the template; true replaces the file. */
    replaceFile(file: string, diff: string): Promise<boolean>;
    replaceScript(name: string, current: string, proposed: string): Promise<ScriptChoice>;
};

/**
 * Where `sync` works and how it talks to the person running it.
 * @category tooling
 */
export type SyncOptions = {
    /** The project directory, holding its root `package.json`. */
    target: string;
    /** The TypeSec checkout whose catalog the project receives; found from this module when omitted. */
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

const SCRIPTS: Record<string, string> = {
    check: "bun tsgo -b packages",
    "check:watch": "bun tsgo -b packages -w",
    test: "bun test",
    "test:watch": "bun --watch test",
    lint: "oxlint --quiet",
    "fmt:check": "bun fmt --check",
    up: "bun update -ri --latest",
};

const DEV_DEPENDENCIES: Record<string, string> = {
    "@types/bun": "catalog:",
    "@typescript/native-preview": "catalog:build",
    "@typesec/bootstrap": "workspace:*",
    oxlint: "catalog:build",
};

/**
 * Brings a project that consumes TypeSec in line with it: configuration files, catalog entries,
 * workspace globs, dev dependencies and scripts.
 *
 * Missing pieces are added. A file or script the project has in a different form is replaced only
 * when the prompt agrees, and a replaced file is moved to `.backup/<time>/` first. Catalog entries
 * and dependencies the project already pins are never changed.
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

    await syncFiles(target, options.now ?? new Date(), options.prompt, log);

    const manifest: Manifest = await manifestFile.json();
    const before = JSON.stringify(manifest);
    const typesec: Manifest = await Bun.file(path.join(source, "package.json")).json();

    syncWorkspaces(manifest, path.relative(target, source), log);
    syncCatalogs(manifest, typesec, log);
    syncDependencies(manifest, log);
    await syncScripts(manifest, options.prompt, log);

    if (JSON.stringify(manifest) !== before) {
        await Bun.write(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
        log("package.json: updated");
    }

    await options.install?.(target);
}

async function syncFiles(target: string, now: Date, prompt: SyncPrompt | undefined, log: (line: string) => void) {
    const backup = path.join(target, BACKUP, now.toISOString().replace(/[:.]/g, "-"));
    let backedUp = false;

    for await (const file of new Bun.Glob("**/*").scan({cwd: TEMPLATE, dot: true})) {
        const template = await Bun.file(path.join(TEMPLATE, file)).text();
        const existing = Bun.file(path.join(target, file));

        if (!(await existing.exists())) {
            await Bun.write(existing, template);
            log(`${file}: created`);
            continue;
        }

        const current = await existing.text();
        if (current === template) continue;

        const diff = unifiedDiff(current, template, [`project/${file}`, `typesec/${file}`]);
        if (!(await prompt?.replaceFile(file, diff))) {
            log(`${file}: differs from the template, kept`);
            continue;
        }

        await mkdir(path.dirname(path.join(backup, file)), {recursive: true});
        await rename(path.join(target, file), path.join(backup, file));
        await Bun.write(path.join(target, file), template);
        backedUp = true;
        log(`${file}: replaced, previous version in ${path.relative(target, path.join(backup, file))}`);
    }

    if (backedUp) await ignoreBackups(target, log);
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

/** The project has to list TypeSec's packages among its workspaces for `workspace:*` to resolve. */
function syncWorkspaces(manifest: Manifest, relative: string, log: (line: string) => void) {
    const glob = path.posix.join(relative.split(path.sep).join("/"), "packages/*");
    const listed = Array.isArray(manifest.workspaces) ? manifest.workspaces : manifest.workspaces?.packages;
    if (listed?.includes(glob)) return;

    const workspaces = workspacesOf(manifest);
    workspaces.packages = [...(workspaces.packages ?? []), glob];
    log(`workspaces: added ${glob}`);
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

function syncDependencies(manifest: Manifest, log: (line: string) => void) {
    const dependencies = (manifest.devDependencies ??= {});

    for (const [name, version] of Object.entries(DEV_DEPENDENCIES)) {
        if (dependencies[name] !== undefined) continue;

        dependencies[name] = version;
        log(`devDependencies: added ${name}@${version}`);
    }
}

async function syncScripts(manifest: Manifest, prompt: SyncPrompt | undefined, log: (line: string) => void) {
    const scripts = (manifest.scripts ??= {});
    let replaceAll = false;

    for (const [name, command] of Object.entries(SCRIPTS)) {
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
