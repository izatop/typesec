import type {Expand, HasUndefined, Rec} from "@typesec/the";
import type {Application, IProto, Meta} from "@typesec/unit";
import {type BaseSchema, type BaseSchemaAsync} from "valibot";
import type {ServeInput} from "../index.mjs";

export type Method = "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "PUT";

export type RouteArgs<TContext, TProto extends IProto<ServeInput> = IProto<ServeInput>> = Meta & {
    app: Application<TContext, TProto, ServeInput, Response>;
};

export type RestResponse = {toString(): string} | BaseSchema<any, any, any>;
export type Schema<T extends BaseSchema<any, any, any>> = T;

export type RestSyncKeys = "params" | "query";
export type RestSyncSchema<T extends BaseSchema<any, any, any> = BaseSchema<any, any, any>> = Rec<RestSyncKeys, T>;
export type RestAsyncSchema = Rec<"body", BaseSchemaAsync<any, any, any>>;
export type RestSchema = Expand<RestSyncSchema & RestAsyncSchema>;

export type ExtendSchema<T1 extends RestSchema, T2 extends Partial<RestSchema>> = {
    [K in keyof T1]-?: NonNullable<K extends keyof T2 ? (HasUndefined<T2[K]> extends true ? T1[K] : T2[K]) : T1[K]>;
};
