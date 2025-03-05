import type {KindPrimitive} from "@typesec/spec";
import type {Rec} from "@typesec/the";
import {SyntaxKind} from "typescript";

export type PrimitiveSyntaxKind =
    | SyntaxKind.StringKeyword
    | SyntaxKind.NumberKeyword
    | SyntaxKind.BooleanKeyword
    | SyntaxKind.BigIntKeyword;

export const primitives: Rec<PrimitiveSyntaxKind, KindPrimitive> = {
    [SyntaxKind.StringKeyword]: "string",
    [SyntaxKind.NumberKeyword]: "number",
    [SyntaxKind.BooleanKeyword]: "boolean",
    [SyntaxKind.BigIntKeyword]: "bigint",
};
