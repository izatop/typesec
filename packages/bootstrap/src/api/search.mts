import type {ProjectIndex, SearchQuery, SymbolEntry} from "./interfaces.mjs";

/**
 * Kind groups, so a caller can ask for "functions" or "types" without knowing how the
 * extractor labels a namespace member or an interface.
 */
const groups: Record<string, string[]> = {
    function: ["function", "member", "method"],
    type: ["type", "interface"],
    const: ["const", "namespace"],
    class: ["class"],
};

/**
 * Filters and ranks the index.
 *
 * Every keyword has to match somewhere, and the strongest match wins: an exact name beats a
 * prefix, which beats a mention in the description. Without keywords the query degrades to a
 * plain listing of whatever the filters allow.
 */
export function search(index: ProjectIndex, query: SearchQuery): SymbolEntry[] {
    const keywords = (query.keywords ?? []).map((keyword) => keyword.toLowerCase()).filter(Boolean);
    const kinds = query.kind ? (groups[query.kind] ?? [query.kind]) : null;
    const ranked: {symbol: SymbolEntry; score: number}[] = [];

    for (const symbol of index.symbols) {
        if (query.package && !symbol.package.includes(query.package)) continue;
        if (kinds && !kinds.includes(symbol.kind)) continue;
        if (query.category && symbol.category !== query.category) continue;
        if (query.undocumented && symbol.description) continue;

        let total = 0;
        let matched = true;

        for (const keyword of keywords) {
            const points = score(symbol, keyword);
            if (points === 0) {
                matched = false;
                break;
            }

            total += points;
        }

        if (matched) ranked.push({symbol, score: total});
    }

    ranked.sort(compare);

    return ranked.slice(0, query.limit ?? ranked.length).map((entry) => entry.symbol);
}

function compare(a: {symbol: SymbolEntry; score: number}, b: {symbol: SymbolEntry; score: number}): number {
    return (
        b.score - a.score ||
        a.symbol.qualified.length - b.symbol.qualified.length ||
        a.symbol.qualified.localeCompare(b.symbol.qualified) ||
        a.symbol.package.localeCompare(b.symbol.package)
    );
}

function score(symbol: SymbolEntry, keyword: string): number {
    const name = symbol.name.toLowerCase();
    const qualified = symbol.qualified.toLowerCase();

    if (name === keyword) return 100;
    if (qualified === keyword) return 90;
    if (name.startsWith(keyword)) return 60;
    if (name.includes(keyword)) return 40;
    if (qualified.includes(keyword)) return 35;
    if (symbol.category?.toLowerCase() === keyword) return 30;
    if (symbol.description?.toLowerCase().includes(keyword)) return 20;
    if (symbol.signature.toLowerCase().includes(keyword)) return 10;
    if ((symbol.import ?? symbol.package).toLowerCase().includes(keyword)) return 5;
    if (symbol.file.toLowerCase().includes(keyword)) return 3;

    return 0;
}

/** Finds the symbols a `show` argument names, by qualified name first and by bare name otherwise. */
export function lookup(index: ProjectIndex, name: string): SymbolEntry[] {
    const needle = name.toLowerCase();
    const exact = index.symbols.filter((symbol) => symbol.qualified.toLowerCase() === needle);

    return exact.length > 0 ? exact : index.symbols.filter((symbol) => symbol.name.toLowerCase() === needle);
}
