import {describe, expect, test} from "bun:test";
import {extract, type RawSymbol} from "./extract.mjs";

const read = (source: string) => extract("/project/src/module.mts", source);

const find = (source: string, qualified: string): RawSymbol | undefined => {
    for (const list of read(source).declared.values()) {
        const found = list.find((symbol) => symbol.qualified === qualified);
        if (found) return found;
    }

    return undefined;
};

describe("extract", () => {
    test("keeps overloads and drops the implementation signature", () => {
        const uniq = find(
            [
                "export function uniq<T>(values: T[]): T[];",
                "export function uniq<T, R>(values: T[], map: (value: T) => R): R[];",
                "export function uniq(values: any[], map?: unknown): any[] { return values; }",
            ].join("\n"),
            "uniq",
        );

        expect(uniq?.signature.split("\n")).toEqual([
            "function uniq<T>(values: T[]): T[]",
            "function uniq<T, R>(values: T[], map: (value: T) => R): R[]",
        ]);
    });

    test("expands a namespace object, including nested groups", () => {
        const source = [
            "function shift<T>(input: T[]): T | undefined { return input[0]; }",
            "function group<T>(values: T[]): T[] { return values; }",
            "export const array = {group, async: {shift}};",
        ].join("\n");

        expect(find(source, "array.group")?.signature).toBe("array.group<T>(values: T[]): T[]");
        expect(find(source, "array.async")?.kind).toBe("namespace");
        expect(find(source, "array.async.shift")?.signature).toBe("array.async.shift<T>(input: T[]): T | undefined");
    });

    test("carries the description of the function a shorthand member points at", () => {
        const source = ["/** Groups values. */", "function group(): void {}", "export const array = {group};"].join(
            "\n",
        );

        expect(find(source, "array.group")?.doc.description).toBe("Groups values.");
    });

    test("prefers a description written on the member itself", () => {
        const source = [
            "/** On the function. */",
            "function group(): void {}",
            "export const array = {",
            "    /** On the member. */",
            "    group,",
            "};",
        ].join("\n");

        expect(find(source, "array.group")?.doc.description).toBe("On the member.");
    });

    test("collapses overloaded class methods the same way", () => {
        const source = [
            "export class Parser {",
            "    public option(pattern: string): void;",
            "    public option(pattern: string, required: boolean): void;",
            "    public option(pattern: string, required = false): void {}",
            "    public get mode(): string { return ''; }",
            "    public set mode(value: string) {}",
            "}",
        ].join("\n");

        expect(find(source, "Parser.option")?.signature.split("\n")).toEqual([
            "Parser.option(pattern: string): void",
            "Parser.option(pattern: string, required: boolean): void",
        ]);

        // A getter and its setter both have a body, so neither is dropped as an implementation.
        expect(find(source, "Parser.mode")?.signature.split("\n")).toHaveLength(2);
    });

    test("reads public class members and skips private ones", () => {
        const source = [
            "export class Router {",
            "    public use<S>(rest: S): void {}",
            "    public get meta(): string { return ''; }",
            "    private hidden(): void {}",
            "    protected internal(): void {}",
            "    #secret(): void {}",
            "    constructor() {}",
            "}",
        ].join("\n");

        const declared = read(source).declared.get("Router") ?? [];

        expect(declared.map((symbol) => symbol.qualified)).toEqual(["Router", "Router.use", "Router.meta"]);
        expect(find(source, "Router.use")?.signature).toBe("Router.use<S>(rest: S): void");
        expect(find(source, "Router.meta")?.signature).toBe("Router.meta: string");
    });

    test("reads the properties a constructor declares", () => {
        const source = [
            "export class Failure {",
            "    constructor(",
            "        /** Why it failed. */",
            "        public readonly code: string,",
            "        private readonly trace: string,",
            "        message: string,",
            "    ) {}",
            "}",
        ].join("\n");

        const declared = read(source).declared.get("Failure") ?? [];

        // A plain parameter is not a member, and a private one is not public.
        expect(declared.map((symbol) => symbol.qualified)).toEqual(["Failure", "Failure.code"]);
        expect(find(source, "Failure.code")).toMatchObject({
            signature: "Failure.code: string",
            doc: {description: "Why it failed."},
        });
    });

    test("records re-exports", () => {
        const surface = read(['export * from "./a.mjs";', 'export {route, rest as serve} from "./b.mjs";'].join("\n"));

        expect(surface.reexports).toEqual([
            {source: "./a.mjs", names: "*"},
            {
                source: "./b.mjs",
                names: [
                    {local: "route", exported: "route"},
                    {local: "rest", exported: "serve"},
                ],
            },
        ]);
    });

    test("keeps a name forwarded from an imported binding", () => {
        const surface = read(['import lifecycle from "./controller.mjs";', "export {lifecycle};"].join("\n"));

        expect(surface.exported.get("lifecycle")).toBe("lifecycle");
        expect(surface.declared.get("lifecycle")?.[0]?.signature).toBe("const lifecycle");
    });

    test("takes a doc written at the export site for a local binding", () => {
        const source = ["const procedure = use();", "/** Builds a procedure. */", "export {procedure};"].join("\n");

        expect(find(source, "procedure")?.doc.description).toBe("Builds a procedure.");
    });

    test("labels declarations by kind and reports their line", () => {
        const source = [
            "/** A record. */",
            "export type Rec<K, V> = Record<K, V>;",
            "export interface IService {}",
            "export const limit: number = 1;",
        ].join("\n");

        expect(find(source, "Rec")).toMatchObject({
            kind: "type",
            line: 2,
            signature: "type Rec<K, V> = Record<K, V>",
            doc: {description: "A record."},
        });
        expect(find(source, "IService")?.kind).toBe("interface");
        expect(find(source, "limit")).toMatchObject({kind: "const", signature: "const limit: number"});
    });

    test("does not attach a doc block that belongs to something else", () => {
        const source = [
            "/** Belongs to first. */",
            "export function first(): void {}",
            "export function second(): void {}",
        ].join("\n");

        expect(find(source, "first")?.doc.description).toBe("Belongs to first.");
        expect(find(source, "second")?.doc.description).toBeUndefined();
    });
});
