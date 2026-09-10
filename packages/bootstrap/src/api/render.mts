import type {PackageEntry, SymbolEntry} from "./interfaces.mjs";

/**
 * How a result is printed. Text is the default because it costs the fewest tokens to read.
 * @category tooling
 */
export type Format = "text" | "json" | "yaml";

const importWidth = 26;
const signatureWidth = 96;

/** Serialises a value for `--json` or `--yaml`, or returns `null` when the format is text. */
export function serialize(value: unknown, format: Format): string | null {
    if (format === "json") return JSON.stringify(value, null, 2);
    if (format === "yaml") return Bun.YAML.stringify(value, null, 2).trimEnd();

    return null;
}

/**
 * One symbol per line, with the import specifier first.
 *
 * The specifier leads because it is what a caller needs before anything else, and the second
 * line carries the description only when there is one — an undocumented index stays compact.
 */
export function renderSymbols(symbols: SymbolEntry[], format: Format): string {
    const serialized = serialize(symbols, format);
    if (serialized !== null) return serialized;
    if (symbols.length === 0) return "Nothing found.";

    const width = Math.min(importWidth, Math.max(...symbols.map((symbol) => specifier(symbol).length)));
    const lines: string[] = [];

    for (const symbol of symbols) {
        const [head = "", ...rest] = symbol.signature.split("\n");
        const overloads = rest.length > 0 ? ` (+${rest.length} overloads)` : "";

        lines.push(`${specifier(symbol).padEnd(width)}  ${truncate(head, signatureWidth)}${overloads}`);
        if (symbol.description) lines.push(`${" ".repeat(width)}  ${firstLine(symbol.description)}`);
        if (symbol.deprecated) lines.push(`${" ".repeat(width)}  deprecated: ${reason(symbol.deprecated)}`);
    }

    return lines.join("\n");
}

/** The full card for one symbol. */
export function renderSymbol(symbol: SymbolEntry, format: Format): string {
    const serialized = serialize(symbol, format);
    if (serialized !== null) return serialized;

    const lines = [symbol.qualified, ""];
    const field = (label: string, value: string): void => void lines.push(`  ${label.padEnd(10)}${value}`);

    field("kind", symbol.kind);
    field("package", symbol.package);
    field("import", symbol.import ?? "internal, not re-exported by an entry point");
    field("source", `${symbol.file}:${symbol.line}`);
    if (symbol.category) field("category", symbol.category);
    if (symbol.deprecated) field("deprecated", reason(symbol.deprecated));

    lines.push("", "  signature");
    for (const line of symbol.signature.split("\n")) lines.push(`    ${line}`);

    if (symbol.description) lines.push("", indent(symbol.description));
    if (symbol.example) lines.push("", "  example", indent(symbol.example, 4));
    if (symbol.see?.length) lines.push("", `  see        ${symbol.see.join(", ")}`);

    return lines.join("\n");
}

/** The package map: what each package is for, how it is entered, how well it is documented. */
export function renderPackages(packages: PackageEntry[], format: Format): string {
    const serialized = serialize(packages, format);
    if (serialized !== null) return serialized;

    const width = Math.max(...packages.map((entry) => entry.name.length));
    const lines: string[] = [];

    for (const entry of packages) {
        const documented = entry.symbols > 0 ? Math.round((entry.documented / entry.symbols) * 100) : 0;

        lines.push(
            `${entry.name.padEnd(width)}  ${entry.dir}`,
            `${" ".repeat(width)}  ${entry.symbols} symbols, ${documented}% documented, ${entry.internal} internal`,
            `${" ".repeat(width)}  entries: ${entry.entries.join(", ")}`,
        );

        if (entry.dependencies.length > 0) {
            lines.push(`${" ".repeat(width)}  depends: ${entry.dependencies.join(", ")}`);
        }

        lines.push("");
    }

    return lines.join("\n").trimEnd();
}

function specifier(symbol: SymbolEntry): string {
    return symbol.import ?? `${symbol.package} (internal)`;
}

function reason(deprecated: string | true): string {
    return deprecated === true ? "yes" : deprecated;
}

function firstLine(description: string): string {
    return truncate(description.split("\n")[0] ?? "", signatureWidth);
}

function truncate(value: string, width: number): string {
    return value.length > width ? `${value.slice(0, width - 1)}…` : value;
}

function indent(value: string, size = 2): string {
    return value
        .split("\n")
        .map((line) => `${" ".repeat(size)}${line}`)
        .join("\n");
}
