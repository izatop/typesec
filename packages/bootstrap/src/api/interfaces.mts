/**
 * What a symbol is. `member` is an entry of a namespace object, `method` one of a class.
 * @category tooling
 */
export type SymbolKind =
    | "function"
    | "type"
    | "interface"
    | "class"
    | "const"
    | "namespace"
    | "member"
    | "method"
    | "enum"
    | "module";

/**
 * Metadata read from a symbol's JSDoc block.
 * @category tooling
 */
export type SymbolDoc = {
    description?: string;
    category?: string;
    example?: string;
    see?: string[];
    deprecated?: string | true;
};

/**
 * One entry of the index: what the symbol is, where it lives, and how to import it.
 * @category tooling
 */
export type SymbolEntry = SymbolDoc & {
    /** Stable identity: `<import or package>#<qualified>`. */
    id: string;
    /** Own name, without the namespace or class prefix. */
    name: string;
    /** Name as written at a call site: `array.uniq`, `Router.use`. */
    qualified: string;
    kind: SymbolKind;
    package: string;
    /** Public import specifier, or `null` when no entry point re-exports the symbol. */
    import: string | null;
    /** Path relative to the project root. */
    file: string;
    line: number;
    /** Declaration head; overloads are joined by a newline. */
    signature: string;
};

/**
 * One package: its entry points, dependencies and documentation coverage.
 * @category tooling
 */
export type PackageEntry = {
    name: string;
    dir: string;
    entries: string[];
    dependencies: string[];
    symbols: number;
    documented: number;
    internal: number;
};

/**
 * The whole public API of a project, ready to search.
 * @category tooling
 */
export type ProjectIndex = {
    root: string;
    packages: PackageEntry[];
    symbols: SymbolEntry[];
};

/**
 * What to look for: keywords that all have to match, plus filters.
 * @category tooling
 */
export type SearchQuery = {
    keywords?: string[];
    package?: string;
    kind?: string;
    category?: string;
    limit?: number;
    undocumented?: boolean;
};
