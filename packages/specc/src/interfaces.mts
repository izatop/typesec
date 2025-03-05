import type {MemberType} from "@typesec/spec";

export type Store = {
    name: string;
    members: MemberType[];
    sourceCode?: string;
    sourceFile?: string;
};
