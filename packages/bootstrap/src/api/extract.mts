import {parseSync} from "oxc-parser";
import type {SymbolDoc, SymbolKind} from "./interfaces.mjs";
import {isDocComment, parseDoc} from "./jsdoc.mjs";

/**
 * A declaration as read from one module, before it is tied to an import path.
 * @category tooling
 */
export type RawSymbol = {
    name: string;
    qualified: string;
    kind: SymbolKind;
    line: number;
    signature: string;
    doc: SymbolDoc;
    /** Local declaration a namespace member points at, for `{uniq}` and `{key: uniq}`. */
    alias?: string;
    /** An overload signature: a declaration without a body. */
    overload?: boolean;
};

/**
 * One `export * from` or `export {a} from` statement.
 * @category tooling
 */
export type ReExport = {
    /** Module specifier as written. */
    source: string;
    /** Re-exported names, or `"*"` for `export * from`. */
    names: "*" | ExportedName[];
};

/**
 * A re-exported name and the name it is exported under.
 * @category tooling
 */
export type ExportedName = {
    local: string;
    exported: string;
};

/**
 * What one module declares and what it passes on from others.
 * @category tooling
 */
export type FileSurface = {
    /** Every declaration in the file, exported or not, keyed by its local name. */
    declared: Map<string, RawSymbol[]>;
    /** Local name to the name the file exports it under. */
    exported: Map<string, string>;
    reexports: ReExport[];
};

type Node = Record<string, any>;

type Context = {
    source: string;
    line: (offset: number) => number;
    doc: (offset: number) => SymbolDoc;
};

/**
 * Reads one module into the declarations it holds and the names it re-exports.
 *
 * Namespace objects (`export const array = {uniq}`) and classes contribute their members
 * as separate symbols, because that is the shape callers actually reach for.
 */
export function extract(file: string, source: string): FileSurface {
    // No explicit lang: oxc reads the dialect from the extension, so .tsx parses its JSX.
    const parsed = parseSync(file, source);
    const offsets = lineOffsets(source);
    const context: Context = {
        source,
        line: (offset) => lineOf(offsets, offset),
        doc: docFinder(source, parsed.comments ?? []),
    };

    const declared = new Map<string, RawSymbol[]>();
    const exported = new Map<string, string>();
    const reexports: ReExport[] = [];
    const forwarded = new Map<string, {line: number; doc: SymbolDoc}>();

    const add = (local: string, symbol: RawSymbol): void => {
        const list = declared.get(local) ?? [];
        list.push(symbol);
        declared.set(local, list);
    };

    for (const node of parsed.program.body as Node[]) {
        if (node["type"] === "ExportAllDeclaration") {
            reexports.push({source: node["source"].value, names: "*"});

            continue;
        }

        if (node["type"] !== "ExportNamedDeclaration") {
            collect(node, context, add);

            continue;
        }

        if (node["source"]) {
            reexports.push({source: node["source"].value, names: specifiers(node)});

            continue;
        }

        if (!node["declaration"]) {
            for (const {local, exported: as} of specifiers(node)) {
                exported.set(local, as);
                forwarded.set(local, {line: context.line(node["start"]), doc: context.doc(node["start"])});
            }

            continue;
        }

        for (const local of collect(node["declaration"], context, add, context.doc(node["start"]))) {
            exported.set(local, local);
        }
    }

    for (const [local, list] of declared) declared.set(local, collapse(list));
    resolveAliases(declared);

    // `export {x}` may name a local declaration or a binding imported from elsewhere. A doc written
    // at the export site describes either; an imported one has nothing else to describe it at all.
    for (const [local, {line, doc}] of forwarded) {
        const declaration = declared.get(local)?.[0];
        if (!declaration) {
            declared.set(local, [
                {name: local, qualified: local, kind: "const", line, signature: `const ${local}`, doc},
            ]);

            continue;
        }

        if (!declaration.doc.description) declaration.doc = doc;
    }

    return {declared, exported, reexports};
}

/**
 * Merges overload runs into a single symbol.
 *
 * An overload signature has no body while the implementation does, and only the overloads are
 * callable from outside — so a run that has them keeps those and drops the implementation. A run
 * without any, such as a getter and its setter, keeps every signature it holds.
 */
function collapse(list: RawSymbol[]): RawSymbol[] {
    const merged: RawSymbol[] = [];
    let run: RawSymbol[] = [];

    const flush = (): void => {
        const [first] = run;
        if (!first) return;

        const overloads = run.filter((symbol) => symbol.overload);
        const signatures = overloads.length > 0 ? overloads : run;

        merged.push({
            ...first,
            signature: signatures.map((symbol) => symbol.signature).join("\n"),
            doc: run.find((symbol) => symbol.doc.description)?.doc ?? first.doc,
        });

        run = [];
    };

    for (const symbol of list) {
        const [first] = run;
        if (first && (first.qualified !== symbol.qualified || first.kind !== symbol.kind)) flush();

        run.push(symbol);
    }

    flush();

    return merged;
}

/** Copies signature and docs from a local declaration onto the namespace member that points at it. */
function resolveAliases(declared: Map<string, RawSymbol[]>): void {
    const first = new Map<string, RawSymbol>();
    for (const [local, list] of declared) {
        if (list[0]) first.set(local, list[0]);
    }

    for (const list of declared.values()) {
        for (const symbol of list) {
            const target = symbol.alias ? first.get(symbol.alias) : undefined;
            if (!target) continue;

            if (symbol.signature === symbol.qualified) {
                symbol.signature = target.signature
                    .split("\n")
                    .map((line) => line.replace(/^(?:function |const )?[\w.$]+/, symbol.qualified))
                    .join("\n");
            }

            if (!symbol.doc.description) symbol.doc = {...target.doc, ...symbol.doc};

            // A shorthand member is a reference, not a definition: point at the code it names.
            symbol.line = target.line;
        }
    }
}

function specifiers(node: Node): ExportedName[] {
    return ((node["specifiers"] ?? []) as Node[]).map((entry) => ({
        local: name(entry["local"]),
        exported: name(entry["exported"]),
    }));
}

/** Records a declaration and its members, returning the local names it introduces. */
function collect(
    node: Node,
    context: Context,
    add: (local: string, symbol: RawSymbol) => void,
    doc?: SymbolDoc,
): string[] {
    const {source, line} = context;
    const own = doc ?? context.doc(node["start"] ?? 0);

    switch (node["type"]) {
        case "FunctionDeclaration":
        case "TSDeclareFunction": {
            const local = name(node["id"]);
            add(local, {
                name: local,
                qualified: local,
                kind: "function",
                line: line(node["start"]),
                signature: `function ${local}${callable(node, source)}`,
                doc: own,
                overload: node["type"] === "TSDeclareFunction",
            });

            return [local];
        }

        case "TSTypeAliasDeclaration": {
            const local = name(node["id"]);
            add(local, {
                name: local,
                qualified: local,
                kind: "type",
                line: line(node["start"]),
                signature: normalize(source.slice(node["start"], node["end"])).replace(/;$/, ""),
                doc: own,
            });

            return [local];
        }

        case "TSInterfaceDeclaration": {
            const local = name(node["id"]);
            add(local, {
                name: local,
                qualified: local,
                kind: "interface",
                line: line(node["start"]),
                signature: `interface ${local}${normalize(source.slice(node["id"].end, node["body"].start))}`.trimEnd(),
                doc: own,
            });

            return [local];
        }

        case "TSEnumDeclaration": {
            const local = name(node["id"]);
            add(local, {
                name: local,
                qualified: local,
                kind: "enum",
                line: line(node["start"]),
                signature: `enum ${local}`,
                doc: own,
            });

            return [local];
        }

        case "TSModuleDeclaration": {
            const local = name(node["id"]);
            add(local, {
                name: local,
                qualified: local,
                kind: "module",
                line: line(node["start"]),
                signature: `namespace ${local}`,
                doc: own,
            });

            return [local];
        }

        case "ClassDeclaration": {
            const local = name(node["id"]);
            add(local, {
                name: local,
                qualified: local,
                kind: "class",
                line: line(node["start"]),
                signature: `class ${local}${normalize(source.slice(node["id"].end, node["body"].start))}`.trimEnd(),
                doc: own,
            });

            for (const member of members(node, local, context)) add(local, member);

            return [local];
        }

        case "VariableDeclaration": {
            const locals: string[] = [];
            for (const declarator of node["declarations"] as Node[]) {
                if (declarator["id"].type !== "Identifier") continue;

                const local = name(declarator["id"]);
                const init = declarator["init"];
                const isObject = init?.type === "ObjectExpression";
                const annotation = declarator["id"].typeAnnotation;
                const typed = annotation ? normalize(source.slice(annotation.start, annotation.end)) : "";

                add(local, {
                    name: local,
                    qualified: local,
                    kind: isObject ? "namespace" : "const",
                    line: line(declarator["start"]),
                    signature: `const ${local}${typed}`,
                    doc: own,
                });

                if (isObject) {
                    for (const member of properties(init, local, context)) add(local, member);
                }

                locals.push(local);
            }

            return locals;
        }
    }

    return [];
}

/** Public members of a class, including the properties its constructor declares. */
function members(node: Node, owner: string, context: Context): RawSymbol[] {
    const {source, line, doc} = context;
    const list: RawSymbol[] = [];

    for (const member of (node["body"]?.body ?? []) as Node[]) {
        if (member["accessibility"] === "private" || member["accessibility"] === "protected") continue;
        if (member["computed"]) continue;
        if (member["key"]?.type === "PrivateIdentifier") continue;
        if (member["type"] !== "MethodDefinition" && member["type"] !== "PropertyDefinition") continue;

        if (member["kind"] === "constructor") {
            list.push(...parameters(member, owner, context));

            continue;
        }

        const key = name(member["key"]);
        const qualified = `${owner}.${key}`;

        if (member["type"] === "MethodDefinition") {
            const accessor = member["kind"] === "get" || member["kind"] === "set";
            list.push({
                name: key,
                qualified,
                kind: "method",
                line: line(member["start"]),
                signature: accessor
                    ? `${qualified}${returns(member["value"], source)}`
                    : `${qualified}${callable(member["value"], source)}`,
                doc: doc(member["start"]),
                overload: !member["value"]?.body,
            });

            continue;
        }

        const annotation = member["typeAnnotation"];
        list.push({
            name: key,
            qualified,
            kind: "method",
            line: line(member["start"]),
            signature: `${qualified}${annotation ? normalize(source.slice(annotation.start, annotation.end)) : ""}`,
            doc: doc(member["start"]),
        });
    }

    return list;
}

/**
 * Members a constructor declares through its parameters.
 *
 * `constructor(public readonly code: X)` defines a public property, so it belongs in the index
 * next to the members written in the class body.
 */
function parameters(member: Node, owner: string, context: Context): RawSymbol[] {
    const {source, line, doc} = context;
    const list: RawSymbol[] = [];

    for (const param of (member["value"]?.params ?? []) as Node[]) {
        if (param["type"] !== "TSParameterProperty") continue;
        if (param["accessibility"] === "private" || param["accessibility"] === "protected") continue;

        const binding = param["parameter"]?.type === "AssignmentPattern" ? param["parameter"].left : param["parameter"];
        const key = name(binding);
        if (!key) continue;

        const annotation = binding?.typeAnnotation;
        const qualified = `${owner}.${key}`;

        list.push({
            name: key,
            qualified,
            kind: "method",
            line: line(param["start"]),
            signature: `${qualified}${annotation ? normalize(source.slice(annotation.start, annotation.end)) : ""}`,
            doc: doc(param["start"]),
        });
    }

    return list;
}

/** Members of a namespace object, recursing into nested objects such as `array.async.shift`. */
function properties(node: Node, owner: string, context: Context): RawSymbol[] {
    const {source, line, doc} = context;
    const list: RawSymbol[] = [];

    for (const property of (node["properties"] ?? []) as Node[]) {
        if (property["type"] !== "Property" || property["computed"]) continue;

        const key = name(property["key"]);
        const qualified = `${owner}.${key}`;
        const value = property["value"];

        if (value?.type === "ObjectExpression") {
            list.push({
                name: key,
                qualified,
                kind: "namespace",
                line: line(property["start"]),
                signature: `const ${qualified}`,
                doc: doc(property["start"]),
            });
            list.push(...properties(value, qualified, context));

            continue;
        }

        const isCallable = value?.type === "FunctionExpression" || value?.type === "ArrowFunctionExpression";
        const accessor = property["kind"] === "get" || property["kind"] === "set";
        const signature = isCallable
            ? accessor
                ? `${qualified}${returns(value, source)}`
                : `${qualified}${callable(value, source)}`
            : qualified;

        list.push({
            name: key,
            qualified,
            kind: "member",
            line: line(property["start"]),
            signature,
            doc: doc(property["start"]),
            ...(value?.type === "Identifier" ? {alias: name(value)} : {}),
        });
    }

    return list;
}

/**
 * Slices the part of a callable that follows its name: type parameters, params, return type.
 *
 * A declaration carries its own name, so the slice starts after the identifier; a function or
 * arrow expression is already anonymous and starts at the parameter list.
 */
function callable(node: Node, source: string): string {
    const from = node["id"]?.end ?? node["start"];
    const to = node["body"]?.start ?? node["end"];

    return normalize(source.slice(from, to)).replace(/;$/, "").replace(/=>$/, "").trimEnd();
}

function returns(node: Node, source: string): string {
    const annotation = node["returnType"];

    return annotation ? normalize(source.slice(annotation.start, annotation.end)) : "";
}

function name(node: Node | null | undefined): string {
    return node?.["name"] ?? node?.["value"] ?? "";
}

function normalize(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function lineOffsets(source: string): number[] {
    const offsets = [0];
    for (let index = 0; index < source.length; index++) {
        if (source[index] === "\n") offsets.push(index + 1);
    }

    return offsets;
}

function lineOf(offsets: number[], target: number): number {
    let low = 0;
    let high = offsets.length - 1;
    while (low < high) {
        const mid = (low + high + 1) >> 1;
        if (offsets[mid]! <= target) low = mid;
        else high = mid - 1;
    }

    return low + 1;
}

type Comment = {type: string; value: string; start: number; end: number};

/** Attaches the JSDoc block that directly precedes an offset, if any. */
function docFinder(source: string, comments: Comment[]): (start: number) => SymbolDoc {
    const blocks = comments.filter((comment) => comment.type === "Block" && isDocComment(comment.value));

    return (start) => {
        let found: Comment | undefined;
        for (const block of blocks) {
            if (block.end <= start) found = block;
            else break;
        }

        if (!found || source.slice(found.end, start).trim() !== "") return {};

        return parseDoc(found.value);
    };
}
