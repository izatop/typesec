import {
    MemberFlags,
    type MemberInput,
    type MemberList,
    type MemberPrimitive,
    type MemberReference,
    type MemberType,
    type MemberWrapper,
} from "@typesec/spec";
import {when} from "@typesec/the";
import {format, log} from "@typesec/tracer";
import assert from "node:assert";
import {capitalize} from "radash";
import ts, {SyntaxKind} from "typescript";
import {primitives, type PrimitiveSyntaxKind} from "../compiler/const.mjs";
import {DECLARATION_SPEC, DECLARATION_SPEC_OF} from "../const.mjs";
import type {Store} from "../interfaces.mjs";
import type {Traverser} from "./Traverser.mjs";

export class TypeReader {
    readonly #store: Store;
    readonly #node: ts.TypeNode;
    readonly #references: Store[] = [];
    readonly #context: Traverser | null;
    readonly #source?: string;

    constructor(context: Traverser | null, name: string, node: ts.TypeNode, source?: string) {
        this.#context = context;

        this.#store = {
            name,
            members: [],
            sourceCode: source,
            sourceFile: context?.getSourceName(),
        };

        this.#node = node;
        this.#source = source;
    }

    public get name(): string {
        return this.#store.name;
    }

    public static from(context: Traverser | null, node: ts.TypeAliasDeclaration): TypeReader | void {
        const name = node.name.escapedText.toString();
        if (!(ts.isTypeReferenceNode(node.type) && ts.isIdentifier(node.type.typeName))) {
            return;
        }

        switch (node.type.typeName.escapedText) {
            case DECLARATION_SPEC:
                return this.fromSpec(context, name, node.type);

            case DECLARATION_SPEC_OF:
                return this.fromSpecOf(context, name, node.type);
        }
    }

    public static fromSpec(context: Traverser | null, name: string, node: ts.TypeReferenceType, source?: string) {
        log("read(Spec<%s, TSource>)", name);
        const [spec] = node.typeArguments ?? [];
        assert(spec, format("Unknown type %s specification", name));

        return new TypeReader(context, name, spec, source);
    }

    public static fromSpecOf(context: Traverser | null, name: string, node: ts.TypeReferenceType, source?: string) {
        log("read(SpecOf<TSource, %s>)", name);
        const [, spec] = node.typeArguments ?? [];
        assert(spec, format("Unknown type %s specification", name));

        return new TypeReader(context, name, spec, source);
    }

    public read(): Store[] {
        log("store(%s)", this.name);
        assert(ts.isTypeLiteralNode(this.#node), format("Wrong type definition of %s", this.name));

        for (const member of this.#node.members) {
            assert(ts.isPropertySignature(member), format("Wrong member signature of %s", this.name));
            this.#store.members.push(this.#storeProperty(member));
        }

        return [this.#store, ...this.#references.filter((v) => Boolean(v))];
    }

    #storeProperty(node: ts.PropertySignature): MemberType {
        assert(ts.isIdentifier(node.name), format("Wrong member identifier of %s", this.name));
        assert(node.type, format("Wrong member type of %s.%s", this.name, node.name.escapedText));
        const name = node.name.escapedText.toString();
        const flags = when(node.questionToken, () => MemberFlags.Optional, 0);

        return this.#storeMember(name, node.type, flags);
    }

    #storeMember(name: string, type: ts.TypeNode, flags: MemberFlags): MemberType {
        switch (type.kind) {
            case SyntaxKind.StringKeyword:
            case SyntaxKind.BooleanKeyword:
            case SyntaxKind.NumberKeyword:
            case SyntaxKind.BigIntKeyword:
                return this.#getPrimitiveMember(name, type.kind, flags);

            case SyntaxKind.TypeReference:
            case SyntaxKind.ArrayType:
            case SyntaxKind.TupleType:
            case SyntaxKind.UnionType:
                return this.#storeComplexType(name, type, flags);
        }

        throw new Error(format("Wrong member type %s of %s.%s", SyntaxKind[type.kind], this.name, name));
    }

    #storeComplexType(name: string, type: ts.TypeNode, flags: MemberFlags): MemberType {
        if (ts.isTypeReferenceNode(type)) {
            return this.#getTypeMember(name, type, flags);
        }

        if (ts.isArrayTypeNode(type)) {
            return this.#getArrayMember(name, type, flags);
        }

        if (ts.isTupleTypeNode(type)) {
            return this.#getTupleMember(name, type, flags);
        }

        if (ts.isUnionTypeNode(type)) {
            return this.#getUnionTypeMember(name, type, flags);
        }

        throw new Error(format("Wrong member type %s of %s.%s", SyntaxKind[type.kind], this.name, name));
    }

    #getPrimitiveMember(name: string, kind: PrimitiveSyntaxKind, flags: MemberFlags): MemberPrimitive {
        log("get(%s.%s, %s)", this.name, name, primitives[kind]);

        return {
            name,
            flags,
            kind: primitives[kind],
        };
    }

    #getTypeMember(name: string, type: ts.TypeReferenceNode, flags: MemberFlags): MemberType {
        assert(ts.isIdentifier(type.typeName), format("Wrong type reference of %s.%s", this.name, name));

        const reference = type.typeName.escapedText.toString();
        switch (reference) {
            case "Input":
                return this.#getInputTypeMember(name, type, flags);

            case "Mutator":
                return this.#getMutatorTypeMember(name, type, flags);

            case "Nullable":
                return this.#storeTypeOfTypeArgumentMember(name, type, flags | MemberFlags.Nullable);
        }

        log("get(%s.%s, %s)", this.name, name, reference);

        return {
            name,
            flags,
            reference,
            kind: "reference",
        };
    }

    #storeTypeOfTypeArgumentMember(name: string, type: ts.TypeReferenceNode, flags: MemberFlags): MemberType {
        const [typeArgument] = type.typeArguments ?? [];
        assert(typeArgument, format("Wrong type reference of %s.%s", this.name, name));

        return this.#storeMember(name, typeArgument, flags);
    }

    #getArrayMember(name: string, type: ts.ArrayTypeNode, flags: MemberFlags): MemberWrapper {
        log("get(%s.%s, %s)", this.name, name, type.elementType);

        return {
            name,
            flags,
            args: [this.#storeMember("<T>", type.elementType, flags)],
            kind: "Array<T>",
        };
    }

    #getTupleMember(name: string, type: ts.TupleTypeNode, flags: MemberFlags): MemberList {
        log("get(%s.%s, %s)", this.name, name, type);

        return {
            name,
            flags,
            members: [],
            kind: "tuple",
        };
    }

    #getUnionTypeMember(name: string, type: ts.UnionTypeNode, flags: MemberFlags): MemberList {
        log("get(%s.%s, %s)", this.name, name, type);
        const membersFlags = flags;
        const members: MemberType[] = [];
        for (const member of type.types) {
            if (ts.isLiteralTypeNode(member) && member.literal.kind === SyntaxKind.NullKeyword) {
                flags |= MemberFlags.Nullable;
                continue;
            }

            members.push(this.#storeMember(name, member, membersFlags));
        }

        return {
            name,
            flags,
            members,
            kind: "union",
        };
    }

    #getInputTypeMember(name: string, type: ts.TypeReferenceNode, flags: MemberFlags): MemberInput {
        log("get(%s.%s, Input<TSpec, TValue>)", this.name, name);
        const [inputType, valueType] = type.typeArguments ?? [];

        return {
            name,
            flags,
            args: [this.#getInput(name, inputType), this.#storeMember("TValue", valueType, 0)],
            kind: "Input<TInput, TValue>",
        };
    }

    #getMutatorTypeMember(name: string, type: ts.TypeReferenceNode, flags: MemberFlags): MemberWrapper {
        log("get(%s.%s, Mutator<T>)", this.name, name);
        const [valueType] = type.typeArguments ?? [];

        return {
            name,
            flags,
            args: [this.#storeMember("<T>", valueType, 0)],
            kind: "Mutator<T>",
        };
    }

    #getInput(name: string, type: ts.TypeNode): MemberReference {
        assert(ts.isTypeReferenceNode(type), format("Wrong type reference of %s.%s", this.name, name));
        assert(ts.isIdentifier(type.typeName), format("Wrong type reference of %s.%s", this.name, name));

        let source = undefined,
            reference = type.typeName.escapedText.toString();

        if (this.#context) {
            source = type.getText(this.#context.getSourceFile());
        }

        switch (reference) {
            case DECLARATION_SPEC:
                reference = format("%s%sInput", this.name, capitalize(name));
                this.#references.push(...TypeReader.fromSpec(null, reference, type, source).read());
                break;
            case DECLARATION_SPEC_OF:
                reference = format("%s%sInput", this.name, capitalize(name));
                this.#references.push(...TypeReader.fromSpecOf(null, reference, type, source).read());
                break;
        }

        return {
            reference,
            name: "<TInput>",
            kind: "reference",
            flags: 0,
        };
    }
}
