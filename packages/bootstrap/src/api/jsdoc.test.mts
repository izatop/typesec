import {describe, expect, test} from "bun:test";
import {isDocComment, parseDoc} from "./jsdoc.mjs";

describe("jsdoc", () => {
    test("tells a doc block from a plain one", () => {
        expect(isDocComment("* a doc ")).toBeTrue();
        expect(isDocComment(" not a doc ")).toBeFalse();
    });

    test("reads a one-line description", () => {
        expect(parseDoc("* Returns unique values. ")).toEqual({description: "Returns unique values."});
    });

    test("keeps paragraphs and drops the leading asterisks", () => {
        const doc = parseDoc("*\n * First line.\n *\n * Second line.\n ");

        expect(doc.description).toBe("First line.\n\nSecond line.");
    });

    test("reads the supported tags", () => {
        const doc = parseDoc(
            "*\n * Groups values.\n * @category collection\n * @see array.map\n * @deprecated use group\n ",
        );

        expect(doc).toEqual({
            description: "Groups values.",
            category: "collection",
            see: ["array.map"],
            deprecated: "use group",
        });
    });

    test("keeps a multi-line example verbatim", () => {
        const doc = parseDoc("*\n * Splits.\n * @example\n * chunk([1, 2], 1);\n * // [[1], [2]]\n ");

        expect(doc.example).toBe("chunk([1, 2], 1);\n// [[1], [2]]");
        expect(doc.description).toBe("Splits.");
    });

    test("marks a bare deprecation", () => {
        expect(parseDoc("* @deprecated ").deprecated).toBeTrue();
    });

    test("stops the description at an unknown tag", () => {
        expect(parseDoc("* Does a thing.\n * @internal hidden\n ").description).toBe("Does a thing.");
    });
});
