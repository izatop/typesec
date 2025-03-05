import type {ID, Input, Mutator, Spec, SpecOf} from "@typesec/spec";
import type {Nullable} from "@typesec/the";
import type {Schema} from "../../src/interfaces.mjs";

export interface IContext {
    users: IUser[];
}

export interface IUser {
    id: number;
    name: string;
    weight?: number;
    bd: Date;
    friends: number[];
    parentId?: number;
    registeredAt: Date;
}

type id = Schema.Resolver<unknown, TUserSpec, IUser, "id">;
type friends = Schema.Resolver<unknown, TUserSpec, IUser, "friends">;

export type TUserSpec = SpecOf<
    IUser,
    {
        id: ID;
        name: string;
        friends: Mutator<TUserSpec[]>;
        friendsCount: number;
        weight?: number;
        age?: number;
        parent?: TUserSpec;
        registeredAt: Date;
    }
>;

export type TOfUserId = Spec<{ofUserId: ID}, {ofUserId: number}>;

export type TUserSpaceSpec = Spec<
    {
        bool?: boolean;
        code?: number | bigint | string | null;
        user: Input<Spec<{id: ID}>, Nullable<TUserSpec>>;
        search: Input<Spec<{q: string}>, TUserSpec[]>;
        friends: Input<TOfUserId, TUserSpec[]>;
        union: number | bigint;
        me: TUserSpec;
    },
    {bool?: boolean}
>;

export type TMySpec = Spec<{
    version: number;
    users: TUserSpaceSpec;
}>;
