import path from "node:path";

/**
 * One package of the project, with its public entry points resolved to files.
 * @category tooling
 */
export type WorkspacePackage = {
    name: string;
    /** Absolute path to the package directory. */
    dir: string;
    /** Package directory relative to the project root. */
    relative: string;
    /** Public subpath (`.`, `./array`) to the absolute file it points at. */
    entries: Map<string, string>;
    dependencies: string[];
};

/**
 * Finds the project root: the nearest directory at or above `start` holding `packages/tsconfig.json`.
 *
 * Walking up lets the tool run from anywhere inside a checkout. A project that consumes TypeSec as
 * a git submodule has no such file of its own, so it points `--root` at the submodule instead.
 * @category tooling
 */
export async function findRoot(start: string): Promise<string> {
    let dir = path.resolve(start);

    for (;;) {
        if (await Bun.file(path.join(dir, "packages", "tsconfig.json")).exists()) {
            return dir;
        }

        const parent = path.dirname(dir);
        if (parent === dir) {
            throw new Error(
                `No TypeSec project at or above ${start}: expected packages/tsconfig.json.\n` +
                    `Pass --root <path> to point at a checkout, such as a git submodule.`,
            );
        }

        dir = parent;
    }
}

/**
 * Reads the packages that make up the project.
 *
 * The package list comes from the `references` of `packages/tsconfig.json`, which is the
 * project's own record of what belongs to the build — a package left out of it, such as an
 * unfinished one, stays out of the index too.
 */
export async function readWorkspace(root: string): Promise<WorkspacePackage[]> {
    const references = await readReferences(path.join(root, "packages", "tsconfig.json"));
    const packages: WorkspacePackage[] = [];

    for (const reference of references) {
        const dir = path.resolve(root, "packages", reference);
        const manifest = await readManifest(path.join(dir, "package.json"));
        if (!manifest) continue;

        packages.push({
            name: manifest.name,
            dir,
            relative: path.relative(root, dir),
            entries: entriesOf(manifest.exports, dir),
            dependencies: Object.keys(manifest.dependencies ?? {}),
        });
    }

    return packages.sort((a, b) => a.name.localeCompare(b.name));
}

type Manifest = {
    name: string;
    exports?: Record<string, unknown>;
    dependencies?: Record<string, string>;
};

async function readReferences(file: string): Promise<string[]> {
    const source = await Bun.file(file).text();

    // A tsconfig may carry comments and trailing commas; JSON.parse may not.
    const config = parseConfig(source, file) as {references?: {path: string}[]};

    return (config.references ?? []).map((reference) => reference.path.replace(/^\.\//, ""));
}

function parseConfig(source: string, file: string): unknown {
    const stripped = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1")
        .replace(/,(\s*[}\]])/g, "$1");

    try {
        return JSON.parse(stripped);
    } catch (reason) {
        throw new Error(`Cannot read ${file}: ${reason instanceof Error ? reason.message : reason}`);
    }
}

async function readManifest(file: string): Promise<Manifest | null> {
    const manifest = Bun.file(file);

    return (await manifest.exists()) ? ((await manifest.json()) as Manifest) : null;
}

/** Flattens an `exports` map into subpath to absolute file, keeping only import conditions. */
function entriesOf(exports: Record<string, unknown> | undefined, dir: string): Map<string, string> {
    const entries = new Map<string, string>();

    for (const [subpath, target] of Object.entries(exports ?? {})) {
        const file = resolveTarget(target);
        if (file) entries.set(subpath, path.resolve(dir, file));
    }

    return entries;
}

function resolveTarget(target: unknown): string | null {
    if (typeof target === "string") return target;
    if (typeof target !== "object" || target === null) return null;

    const conditions = target as Record<string, unknown>;

    return resolveTarget(conditions["import"] ?? conditions["default"] ?? null);
}
