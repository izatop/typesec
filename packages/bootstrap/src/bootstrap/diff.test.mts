import {describe, expect, test} from "bun:test";
import {unifiedDiff} from "./diff.mjs";

describe("unifiedDiff", () => {
    test("is empty for equal texts", () => {
        expect(unifiedDiff("a\nb\n", "a\nb\n", ["old", "new"])).toBe("");
    });

    test("marks removed and added lines under the labels", () => {
        const diff = unifiedDiff("a\nb\nc", "a\nB\nc", ["project/x", "typesec/x"]);

        expect(diff).toBe(["--- project/x", "+++ typesec/x", "  a", "- b", "+ B", "  c"].join("\n"));
    });

    test("keeps three lines of context and separates distant changes", () => {
        const before = Array.from({length: 20}, (_, index) => `line ${index}`);
        const after = before.map((line, index) => (index === 1 || index === 18 ? `${line}!` : line));
        const lines = unifiedDiff(before.join("\n"), after.join("\n"), ["a", "b"]).split("\n");

        expect(lines).toContain("...");
        expect(lines).toContain("  line 4");
        expect(lines).not.toContain("  line 5");
        expect(lines).toContain("+ line 18!");
    });
});
