import {Glob} from "bun";
import path from "node:path";
import {extract, type FileSurface, type RawSymbol} from "./extract.mjs";
import type {PackageEntry, ProjectIndex, SymbolEntry} from "./interfaces.mjs";
import {findRoot, readWorkspace, type WorkspacePackage} from "./workspace.mjs";

/** Where a public name ends up: the module that declares it, under which local name. */
type Origin = {
    file: string;
    local: string;
};

/** Extensions a package's sources may use. */
const sourceExtensions = [".mts", ".tsx"];

const sourceGlob = new Glob("src/**/*.{mts,tsx}");

/**
 * Builds the public API index of a TypeSec project.
 *
 * Every module is parsed, then each package's `exports` map is walked through its re-export
 * chain, so a symbol carries the specifier a caller would actually import it from. A symbol
 * its own module exports but no entry point re-exports gets a `null` import and reads as
 * internal — that is how an unreachable export shows up.
 *
 * `start` may be any directory inside a checkout; the root is found by walking up from it.
 */
export async function indexProject(start: string): Promise<ProjectIndex> {
    const root = await findRoot(start);
    const workspace = await readWorkspace(root);
    const files = new Map<string, FileSurface>();
    const symbols: SymbolEntry[] = [];
    const packages: PackageEntry[] = [];

    for (const entry of workspace) {
        for (const file of await sourcesOf(entry)) {
            files.set(file, extract(file, await Bun.file(file).text()));
        }
    }

    for (const entry of workspace) {
        const imports = publicNames(entry, files);
        const own = symbolsOf(entry, files, imports, root);

        symbols.push(...own);
        packages.push({
            name: entry.name,
            dir: entry.relative,
            entries: [...entry.entries.keys()].sort(),
            dependencies: entry.dependencies.sort(),
            symbols: own.length,
            documented: own.filter((symbol) => symbol.description).length,
            internal: own.filter((symbol) => symbol.import === null).length,
        });
    }

    return {root, packages, symbols};
}

async function sourcesOf(entry: WorkspacePackage): Promise<string[]> {
    const files: string[] = [];

    for await (const relative of sourceGlob.scan({cwd: entry.dir})) {
        if (/\.test\.(mts|tsx)$/.test(relative)) continue;
        if (relative.split("/").includes("test")) continue;

        files.push(path.resolve(entry.dir, relative));
    }

    return files.sort();
}

/** Maps every reachable origin to the specifier callers should import it from. */
function publicNames(entry: WorkspacePackage, files: Map<string, FileSurface>): Map<string, string> {
    const imports = new Map<string, string>();

    for (const [subpath, file] of entry.entries) {
        const specifier = subpath === "." ? entry.name : `${entry.name}${subpath.slice(1)}`;

        for (const origin of reachable(file, files, new Set()).values()) {
            const key = keyOf(origin);
            const known = imports.get(key);
            if (!known || preferable(specifier, known, entry.name)) imports.set(key, specifier);
        }
    }

    return imports;
}

/**
 * A subpath beats the package root.
 *
 * The project imports helpers that way itself — `@typesec/the/fn` rather than `@typesec/the` —
 * so the index points at the same specifier the code around it uses.
 */
function preferable(candidate: string, known: string, root: string): boolean {
    if (known === root && candidate !== root) return true;
    if (candidate === root) return false;

    return candidate.length < known.length;
}

/**
 * Walks a module's exports and re-exports into the origins they expose.
 *
 * `visiting` guards against an import cycle and is cleared on the way out, because a module reached
 * along a second path has to answer with its names again — otherwise a named re-export of a module
 * some other branch already walked would come up empty.
 */
function reachable(file: string, files: Map<string, FileSurface>, visiting: Set<string>): Map<string, Origin> {
    const names = new Map<string, Origin>();
    const surface = files.get(file);
    if (!surface || visiting.has(file)) return names;

    visiting.add(file);

    for (const [local, exported] of surface.exported) {
        names.set(exported, {file, local});
    }

    for (const reexport of surface.reexports) {
        const target = resolveSpecifier(file, reexport.source, files);
        if (!target) continue;

        const exposed = reachable(target, files, visiting);
        if (reexport.names === "*") {
            for (const [name, origin] of exposed) names.set(name, origin);

            continue;
        }

        for (const {local, exported} of reexport.names) {
            const origin = exposed.get(local);
            if (origin) names.set(exported, origin);
        }
    }

    visiting.delete(file);

    return names;
}

/**
 * Resolves a relative specifier to the file it names.
 *
 * Sources import each other by the extension they compile to, or by none at all, so the compiled
 * suffix is swapped for each source extension and a bare path is also tried as a directory.
 */
function resolveSpecifier(from: string, specifier: string, files: Map<string, FileSurface>): string | null {
    if (!specifier.startsWith(".")) return null;

    const base = path.resolve(path.dirname(from), specifier);
    const stem = base.replace(/\.(mjs|js|jsx)$/, "");
    const candidates = [
        base,
        ...sourceExtensions.map((extension) => `${stem}${extension}`),
        ...sourceExtensions.map((extension) => path.join(base, `index${extension}`)),
    ];

    return candidates.find((candidate) => files.has(candidate)) ?? null;
}

function symbolsOf(
    entry: WorkspacePackage,
    files: Map<string, FileSurface>,
    imports: Map<string, string>,
    root: string,
): SymbolEntry[] {
    const symbols: SymbolEntry[] = [];

    for (const [file, surface] of files) {
        if (!file.startsWith(`${entry.dir}${path.sep}`)) continue;

        const relative = path.relative(root, file);

        for (const local of surface.exported.keys()) {
            const specifier = imports.get(keyOf({file, local})) ?? null;

            for (const symbol of surface.declared.get(local) ?? []) {
                symbols.push(toEntry(symbol, entry.name, specifier, relative));
            }
        }
    }

    return symbols;
}

function toEntry(symbol: RawSymbol, pkg: string, specifier: string | null, file: string): SymbolEntry {
    return {
        id: `${specifier ?? file}#${symbol.qualified}`,
        name: symbol.name,
        qualified: symbol.qualified,
        kind: symbol.kind,
        package: pkg,
        import: specifier,
        file,
        line: symbol.line,
        signature: symbol.signature,
        ...symbol.doc,
    };
}

function keyOf(origin: Origin): string {
    return `${origin.file}#${origin.local}`;
}
