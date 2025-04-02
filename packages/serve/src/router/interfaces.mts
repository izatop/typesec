import type {Fn, Rec} from "@typesec/the";
import type {Application, Meta, ProtoAbstract} from "@typesec/unit";
import type {ServeInput} from "../index.mjs";

export type Method = "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "PUT";

export type RouteArgs<TContext, TProto extends ProtoAbstract<ServeInput> = ProtoAbstract<ServeInput>> = Meta & {
    app: Application<TContext, TProto, ServeInput, Response>;
};

export type RestResponse = {toString(): string};

export type RestTransforms = Rec<string, Fn<[ServeInput], any>>;
