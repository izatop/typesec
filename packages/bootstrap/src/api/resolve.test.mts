import {afterAll, describe, expect, test} from "bun:test";
import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {indexProject} from "./resolve.mjs";

const root = path.resolve(import.meta.dir, "../../../..");
const index = await indexProject(root);

const one = (qualified: string) => index.symbols.find((symbol) => symbol.qualified === qualified);

describe("indexProject", () => {
    test("indexes the packages the build references", () => {
        const names = index.packages.map((entry) => entry.name);

        expect(names).toContain("@typesec/the");
        expect(names).toContain("@typesec/core");
        expect(names).not.toContain("@typesec/gup");
    });

    test("points a symbol at the subpath the sources import it by", () => {
        expect(one("array.uniq")).toMatchObject({
            kind: "member",
            package: "@typesec/the",
            import: "@typesec/the/array",
            file: "packages/the/src/array.mts",
        });

        expect(one("Rec")?.import).toBe("@typesec/the/type");
        expect(one("ttl.parse")?.import).toBe("@typesec/the/ttl");
    });

    test("resolves a symbol through a chain of star re-exports", () => {
        expect(one("pipeline")).toMatchObject({package: "@typesec/sam", import: "@typesec/sam"});
        expect(one("runtime")).toMatchObject({package: "@typesec/core", import: "@typesec/core"});
        expect(one("Router.use")).toMatchObject({package: "@typesec/serve", import: "@typesec/serve"});
    });

    test("keeps a name a package exports but no entry point re-exports, marked internal", () => {
        expect(one("parserStep")).toMatchObject({package: "@typesec/sam", import: null});
    });

    test("reports a source location for every symbol", () => {
        expect(index.symbols.every((symbol) => symbol.line > 0 && symbol.file.startsWith("packages/"))).toBeTrue();
    });

    test("leaves tests and test fixtures out", () => {
        expect(index.symbols.some((symbol) => symbol.file.includes(".test."))).toBeFalse();
        expect(index.symbols.some((symbol) => symbol.file.includes("/test/"))).toBeFalse();
    });
});

describe("indexProject over a fixture project", () => {
    const roots: string[] = [];

    afterAll(async () => {
        await Promise.all(roots.map((root) => rm(root, {recursive: true, force: true})));
    });

    async function build(files: Record<string, string>): Promise<string> {
        const root = await mkdtemp(path.join(tmpdir(), "typesec-api-"));
        roots.push(root);

        for (const [file, content] of Object.entries(files)) {
            await Bun.write(path.join(root, file), content);
        }

        return root;
    }

    test("exposes a module reached along two different re-export paths", async () => {
        // `left` and `right` each forward one name out of the same module. Reaching `shared` the
        // second time has to answer with its names again, or `b` never becomes public.
        const root = await build({
            "packages/tsconfig.json": JSON.stringify({references: [{path: "./alpha"}]}),
            "packages/alpha/package.json": JSON.stringify({
                name: "@fixture/alpha",
                exports: {".": {import: "./src/index.mts"}},
            }),
            "packages/alpha/src/index.mts": ['export * from "./left.mjs";', 'export * from "./right.mjs";'].join("\n"),
            "packages/alpha/src/left.mts": 'export {a} from "./shared.mjs";',
            "packages/alpha/src/right.mts": 'export {b} from "./shared.mjs";',
            "packages/alpha/src/shared.mts": ["export const a = 1;", "export const b = 2;"].join("\n"),
        });

        const fixture = await indexProject(root);
        const found = fixture.symbols.filter((symbol) => symbol.import === "@fixture/alpha");

        expect(found.map((symbol) => symbol.qualified).sort()).toEqual(["a", "b"]);
    });

    test("finds the root from a directory inside the checkout", async () => {
        const root = await build({
            "packages/tsconfig.json": JSON.stringify({references: [{path: "./gamma"}]}),
            "packages/gamma/package.json": JSON.stringify({
                name: "@fixture/gamma",
                exports: {".": {import: "./src/index.mts"}},
            }),
            "packages/gamma/src/index.mts": "export const value = 1;",
        });

        const nested = await indexProject(path.join(root, "packages", "gamma", "src"));

        expect(nested.root).toBe(root);
        expect(nested.symbols.map((symbol) => symbol.qualified)).toEqual(["value"]);
    });

    test("indexes .tsx sources, JSX and all", async () => {
        const root = await build({
            "packages/tsconfig.json": JSON.stringify({references: [{path: "./view"}]}),
            "packages/view/package.json": JSON.stringify({
                name: "@fixture/view",
                exports: {".": {import: "./src/index.mts"}},
            }),
            "packages/view/src/index.mts": 'export * from "./Button.js";',
            "packages/view/src/Button.tsx": [
                "/**",
                " * A button.",
                " * @category view",
                " */",
                "export function Button({label}: {label: string}) {",
                '    return <button className="b">{label}</button>;',
                "}",
            ].join("\n"),
            // Excluded like any other co-located test.
            "packages/view/src/Button.test.tsx": "export const ignored = 1;",
        });

        const fixture = await indexProject(root);

        expect(fixture.symbols.map((symbol) => symbol.qualified)).toEqual(["Button"]);
        expect(fixture.symbols[0]).toMatchObject({
            kind: "function",
            import: "@fixture/view",
            file: "packages/view/src/Button.tsx",
            signature: "function Button({label}: {label: string})",
            category: "view",
            description: "A button.",
        });
    });

    test("reads a tsconfig written with comments and a trailing comma", async () => {
        // tsconfig.json is JSONC by convention, and most real ones use it.
        const root = await build({
            "packages/tsconfig.json": [
                "{",
                "    // the packages that make up the build",
                '    "references": [',
                '        {"path": "./delta"}, /* only one for now */',
                "    ],",
                "}",
            ].join("\n"),
            "packages/delta/package.json": JSON.stringify({
                name: "@fixture/delta",
                exports: {".": {import: "./src/index.mts"}},
            }),
            "packages/delta/src/index.mts": "export const value = 1;",
        });

        const fixture = await indexProject(root);

        expect(fixture.packages.map((entry) => entry.name)).toEqual(["@fixture/delta"]);
    });

    test("names the file it could not read", async () => {
        const root = await build({"packages/tsconfig.json": "{ this is not a config }"});

        await expect(indexProject(root)).rejects.toThrow("packages/tsconfig.json");
    });

    test("names the missing file when there is no project to index", async () => {
        const root = await build({"package.json": JSON.stringify({name: "consumer"})});

        // A project that consumes TypeSec as a submodule has no packages/tsconfig.json of its own.
        await expect(indexProject(root)).rejects.toThrow("expected packages/tsconfig.json");
    });

    test("reads documentation and entry points of a package it has never seen", async () => {
        const root = await build({
            "packages/tsconfig.json": JSON.stringify({references: [{path: "./beta"}]}),
            "packages/beta/package.json": JSON.stringify({
                name: "@fixture/beta",
                exports: {".": {import: "./src/index.mts"}, "./util": {import: "./src/util.mts"}},
                dependencies: {zod: "1.0.0"},
            }),
            "packages/beta/src/index.mts": 'export * from "./util.mjs";',
            "packages/beta/src/util.mts": [
                "/**",
                " * Doubles a number.",
                " * @category math",
                " */",
                "export function twice(value: number): number {",
                "    return value * 2;",
                "}",
            ].join("\n"),
        });

        const fixture = await indexProject(root);
        const [beta] = fixture.packages;

        expect(beta).toMatchObject({
            name: "@fixture/beta",
            entries: [".", "./util"],
            dependencies: ["zod"],
            documented: 1,
        });

        // The subpath wins over the package root, the way the sources import helpers.
        expect(fixture.symbols[0]).toMatchObject({
            qualified: "twice",
            import: "@fixture/beta/util",
            category: "math",
            description: "Doubles a number.",
        });
    });
});
