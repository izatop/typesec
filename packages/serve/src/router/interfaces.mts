import type {Application, IProto, Meta} from "@typesec/unit";
import type {BaseSchema} from "valibot";
import type {Rec} from "../../../the/src/interfaces.mjs";
import type {ServeInput} from "../index.mjs";

export type Method = "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "PUT";

export type RouteArgs<TContext, TProto extends IProto<ServeInput> = IProto<ServeInput>> = Meta & {
    app: Application<TContext, TProto, ServeInput, Response>;
};

export type RestResponse = {toString(): string} | BaseSchema<any, any, any>;

export type RestKeys = "params" | "query" | "body";
export type RestMapValue = Rec<RestKeys, unknown>;
export type RestSchema = Rec<RestKeys, BaseSchema<any, any, any>>;
