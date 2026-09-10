import {describe, expect, test} from "bun:test";
import type {ProjectIndex, SymbolEntry} from "./interfaces.mjs";
import {lookup, search} from "./search.mjs";

function symbol(entry: Partial<SymbolEntry> & Pick<SymbolEntry, "qualified">): SymbolEntry {
    const [name = entry.qualified] = entry.qualified.split(".").slice(-1);

    return {
        id: `test#${entry.qualified}`,
        name,
        kind: "function",
        package: "@typesec/the",
        import: "@typesec/the",
        file: "packages/the/src/module.mts",
        line: 1,
        signature: `function ${entry.qualified}()`,
        ...entry,
    };
}

const index: ProjectIndex = {
    root: "/project",
    packages: [],
    symbols: [
        symbol({qualified: "uniq", description: "Returns unique values."}),
        symbol({qualified: "array.uniq", kind: "member"}),
        symbol({qualified: "uniqueId", package: "@typesec/core", import: "@typesec/core"}),
        symbol({qualified: "Rec", kind: "type", category: "type"}),
        symbol({qualified: "Router", kind: "class", description: "Builds a typed route."}),
        symbol({qualified: "group", kind: "member", category: "collection"}),
        symbol({qualified: "date.shift", kind: "member"}),
    ],
};

const names = (found: SymbolEntry[]) => found.map((entry) => entry.qualified);

describe("search", () => {
    test("ranks an exact name above a prefix and a description mention", () => {
        expect(names(search(index, {keywords: ["uniq"]}))).toEqual(["uniq", "array.uniq", "uniqueId"]);
    });

    test("requires every keyword to match", () => {
        expect(names(search(index, {keywords: ["uniq", "values"]}))).toEqual(["uniq"]);
        expect(names(search(index, {keywords: ["uniq", "missing"]}))).toEqual([]);
    });

    test("finds by description alone", () => {
        expect(names(search(index, {keywords: ["typed route"]}))).toEqual(["Router"]);
    });

    test("groups kinds, so members count as functions", () => {
        expect(names(search(index, {kind: "function"}))).toEqual([
            "uniq",
            "group",
            "uniqueId",
            "array.uniq",
            "date.shift",
        ]);
        expect(names(search(index, {kind: "type"}))).toEqual(["Rec"]);
        expect(names(search(index, {kind: "member"}))).toEqual(["group", "array.uniq", "date.shift"]);
    });

    test("filters by package, category and documentation state", () => {
        expect(names(search(index, {package: "core"}))).toEqual(["uniqueId"]);
        expect(names(search(index, {category: "collection"}))).toEqual(["group"]);
        expect(names(search(index, {keywords: ["uniq"], undocumented: true}))).toEqual(["array.uniq", "uniqueId"]);
    });

    test("honours the limit", () => {
        expect(search(index, {keywords: ["uniq"], limit: 2})).toHaveLength(2);
    });

    test("lists everything without keywords", () => {
        expect(search(index, {})).toHaveLength(index.symbols.length);
    });

    test("looks up a qualified name before a bare one", () => {
        expect(names(lookup(index, "array.uniq"))).toEqual(["array.uniq"]);
        expect(names(lookup(index, "uniq"))).toEqual(["uniq"]);
        expect(names(lookup(index, "shift"))).toEqual(["date.shift"]);
        expect(lookup(index, "nothing")).toEqual([]);
    });
});
