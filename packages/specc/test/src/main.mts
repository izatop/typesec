import type {ID, Input, Mutator, Spec, SpecOf} from "@typesec/spec";
import type {ICheckList, ITodo, IUser, TodoStatus} from "./spec/interfaces.mjs";

export type TUserSpec = SpecOf<
    IUser,
    {
        id: number;
        name: string;
    }
>;

export type TCheckListSpec = SpecOf<
    ICheckList,
    {
        id: ID;
        description: string;
        done: boolean;
    }
>;

export type TTodoSpec = SpecOf<
    ITodo,
    {
        id: ID;
        title: string;
        status: TodoStatus;
        user: TUserSpec;
        checklist: Input<Spec<{done?: boolean}>, TCheckListSpec[]>;
        attachments: Mutator<string[]>;
        description: string;
        updatedAt: Mutator<number>;
        elapsedMs: number;
    }
>;
