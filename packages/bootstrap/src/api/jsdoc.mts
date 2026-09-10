import type {SymbolDoc} from "./interfaces.mjs";

const tagMatch = /^\s*@(\w+)[ \t]*(.*)$/;

/**
 * Tells a JSDoc block from a plain block comment.
 *
 * `oxc` reports the comment body without the delimiters, so a JSDoc block is the one
 * whose body starts with the second asterisk of the opening sequence.
 */
export function isDocComment(value: string): boolean {
    return value.startsWith("*");
}

/**
 * Reads a JSDoc block body into structured metadata.
 *
 * Everything before the first tag is the description. Recognised tags are `@category`,
 * `@example`, `@see` and `@deprecated`; unknown tags end the description and are ignored.
 */
export function parseDoc(value: string): SymbolDoc {
    const description: string[] = [];
    const example: string[] = [];
    const see: string[] = [];
    const doc: SymbolDoc = {};

    let current: "description" | "example" | null = "description";

    for (const line of clean(value)) {
        const tag = line.match(tagMatch);
        if (!tag) {
            if (current === "description") description.push(line);
            if (current === "example") example.push(line);

            continue;
        }

        const [, name = "", rest = ""] = tag;
        current = null;

        switch (name) {
            case "category":
                doc.category = rest.trim();
                break;
            case "example":
                current = "example";
                if (rest.trim()) example.push(rest);
                break;
            case "see":
                if (rest.trim()) see.push(rest.trim());
                break;
            case "deprecated":
                doc.deprecated = rest.trim() || true;
                break;
        }
    }

    const summary = join(description);
    if (summary) doc.description = summary;

    const snippet = join(example);
    if (snippet) doc.example = snippet;

    if (see.length > 0) doc.see = see;

    return doc;
}

function clean(value: string): string[] {
    return value
        .slice(1)
        .split("\n")
        .map((line) => line.replace(/^\s*\*[ \t]?/, "").trimEnd());
}

function join(lines: string[]): string {
    return lines
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
