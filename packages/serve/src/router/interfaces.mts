import type {Fn, Rec} from "@typesec/the";
import type {Application, Meta, ProtoAbstract} from "@typesec/unit";
import type {z, ZodType} from "zod";
import type {Router, ServeInput} from "../index.mjs";

/**
 * The HTTP methods a route may answer.
 * @category http
 */
export type Method = "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "PUT";

/**
 * Turns an error raised inside a route into a response.
 * @category http
 */
export type RestOnError = (reason: unknown) => Response;

/**
 * What `route` takes: the application, its metadata, and an optional error handler.
 * @category http
 */
export type RouteArgs<TContext, TProto extends ProtoAbstract<ServeInput> = ProtoAbstract<ServeInput>> = Meta & {
    app: Application<TContext, TProto, ServeInput, Response>;
    error?: RestOnError;
};

/**
 * The default response value of a route, rendered through `toString` unless a schema is set with `as`.
 * @category http
 */
export type RestResponse = {toString(): string};

/**
 * Named transforms a route exposes on its protocol, each turning the request into a parsed value.
 * @category http
 */
export type RestTransforms = Rec<string, Fn<[ServeInput], any>>;

/**
 * What `rest` takes: the application and an optional error handler, with metadata supplied per route.
 * @category http
 */
export type RestArgs<TContext, TProto extends ProtoAbstract<ServeInput> = ProtoAbstract<ServeInput>> = {
    app: Application<TContext, TProto, ServeInput, Response>;
    error?: RestOnError;
};

/**
 * A prepared route builder awaiting only its metadata.
 * @category http
 */
export type RestHandle<TContext> = (meta: Meta) => Router<TContext, {}, RestResponse>;

/**
 * A synchronous request transform validated by a schema.
 * @category http
 */
export type UseTransform<S extends ZodType> = Fn<[ServeInput], z.output<S>>;
/**
 * An asynchronous request transform validated by a schema.
 * @category http
 */
export type UseTransformAsync<S extends ZodType> = Fn<[ServeInput], Promise<z.output<S>>>;
