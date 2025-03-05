export type KindInternal = "ID" | "Date";
export type KindPrimitive = "string" | "number" | "boolean" | "bigint";
export type KindReference = "reference";
export type KindInput = "Input<TInput, TValue>";
export type KindMutator = "Mutator<T>";
export type KindArray = "Array<T>";
export type KindTuple = "tuple";
export type KindUnion = "union";
export type MemberKind =
    | KindPrimitive
    | KindInternal
    | KindReference
    | KindArray
    | KindInput
    | KindMutator
    | KindTuple
    | KindUnion;

export enum MemberFlags {
    None = 0,
    Optional = 1,
    Nullable = 2,
}

export interface Container {
    name: string;
    kind: MemberKind;
    flags: number;
}

export interface MemberPrimitive extends Container {
    kind: KindPrimitive;
}

export interface MemberInternal extends Container {
    kind: KindInternal;
}

export interface MemberReference extends Container {
    kind: KindReference;
    reference: string;
}

export interface MemberList extends Container {
    kind: KindTuple | KindUnion;
    members: MemberType[];
}

export interface MemberInput extends Container {
    kind: KindInput;
    args: [MemberReference, MemberType];
}

export interface MemberWrapper extends Container {
    kind: KindMutator | KindArray;
    args: [MemberType];
}

export type MemberType = MemberPrimitive | MemberInternal | MemberReference | MemberList | MemberInput | MemberWrapper;
