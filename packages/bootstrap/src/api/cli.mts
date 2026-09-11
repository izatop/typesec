import {program} from "@commander-js/extra-typings";
import {renderPackages, renderSymbol, renderSymbols, type Format} from "./render.mjs";
import type {ProjectIndex} from "./interfaces.mjs";
import {indexProject} from "./resolve.mjs";
import {lookup, search} from "./search.mjs";
import {findRoot} from "./workspace.mjs";

type FormatOptions = {json?: boolean; yaml?: boolean};

const write = (value: string): void => void process.stdout.write(`${value}\n`);

/**
 * The checkout to index: the one around the working directory, else the one this tool is part of.
 *
 * A project that consumes TypeSec as a git submodule runs the submodule's own bin from outside any
 * checkout, so falling back to where the tool lives spares it from passing --root every time.
 */
function rootOf(explicit?: string): Promise<string> {
    if (explicit) return findRoot(explicit);

    return findRoot(process.cwd()).catch(() => findRoot(import.meta.dir));
}

/** Reports a missing or wrong project root as a message rather than a stack trace. */
async function load(start?: string): Promise<ProjectIndex> {
    try {
        return await indexProject(await rootOf(start));
    } catch (reason) {
        process.exitCode = 1;
        write(reason instanceof Error ? reason.message : `${reason}`);
        process.exit(1);
    }
}

function formatOf(options: FormatOptions): Format {
    if (options.json) return "json";
    if (options.yaml) return "yaml";

    return "text";
}

const cli = program
    .name("typesec-api")
    .description("Public API index of a TypeSec project: packages, functions, types, with keyword search")
    .option("-r, --root <path>", "TypeSec checkout to index; found automatically when omitted");

cli.command("packages")
    .description("List the packages, their entry points and documentation coverage")
    .option("--json", "Machine-readable output")
    .option("--yaml", "Machine-readable output")
    .action(async (options) => {
        const index = await load(cli.opts().root);
        write(renderPackages(index.packages, formatOf(options)));
    });

cli.command("search", {isDefault: true})
    .argument("[keywords...]", "Keywords; every one has to match. Without any, lists everything the filters allow")
    .description("Search functions, types, classes and namespace members")
    .option("-p, --package <name>", "Restrict to a package, by full or partial name")
    .option("-k, --kind <kind>", "function | type | class | const, or an exact kind such as method")
    .option("-c, --category <name>", "Restrict to a @category")
    .option("-l, --limit <count>", "Maximum results", Number)
    .option("-u, --undocumented", "Only symbols without a description")
    .option("--json", "Machine-readable output")
    .option("--yaml", "Machine-readable output")
    .action(async (keywords, options) => {
        const index = await load(cli.opts().root);
        const found = search(index, {
            keywords,
            package: options.package,
            kind: options.kind,
            category: options.category,
            limit: options.limit,
            undocumented: options.undocumented,
        });

        write(renderSymbols(found, formatOf(options)));
    });

cli.command("show")
    .argument("<name>", "Qualified name such as array.uniq, or a bare name")
    .description("Show one symbol in full: signature, import path, source location, docs")
    .option("--json", "Machine-readable output")
    .option("--yaml", "Machine-readable output")
    .action(async (name, options) => {
        const index = await load(cli.opts().root);
        const found = lookup(index, name);
        const format = formatOf(options);

        if (found.length === 0) {
            process.exitCode = 1;
            write(`Unknown symbol "${name}". Try: typesec-api search ${name}`);

            return;
        }

        if (format !== "text") {
            write(renderSymbols(found, format));

            return;
        }

        write(found.map((symbol) => renderSymbol(symbol, format)).join("\n\n"));
    });

await cli.parseAsync();
