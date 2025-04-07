import type {Fn, Rec} from "@typesec/the";
import type {Application, Meta, ProtoAbstract} from "@typesec/unit";
import type {BaseSchema, BaseSchemaAsync, InferOutput} from "valibot";
import type {Router, ServeInput} from "../index.mjs";

export type Method = "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "PUT";

export type RestOnError = (reason: unknown) => Response;

export type RouteArgs<TContext, TProto extends ProtoAbstract<ServeInput> = ProtoAbstract<ServeInput>> = Meta & {
    app: Application<TContext, TProto, ServeInput, Response>;
    error?: RestOnError;
};

export type RestResponse = {toString(): string};

export type RestTransforms = Rec<string, Fn<[ServeInput], any>>;

export type RestArgs<TContext, TProto extends ProtoAbstract<ServeInput> = ProtoAbstract<ServeInput>> = {
    app: Application<TContext, TProto, ServeInput, Response>;
    error?: RestOnError;
};

export type RestHandle<TContext> = (meta: Meta) => Router<TContext, {}, RestResponse>;

export type UseTransform<S extends BaseSchema<any, any, any>> = Fn<[ServeInput], InferOutput<S>>;
export type UseTransformAsync<S extends BaseSchemaAsync<any, any, any>> = Fn<[ServeInput], Promise<InferOutput<S>>>;
