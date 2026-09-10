import type {Fn} from "@typesec/the";
import type {Meta, ProtoAbstract} from "@typesec/unit";
import {z, type ZodObject, type ZodType} from "zod";
import type {ServeInput} from "../index.mjs";
import {Router} from "./Router.mjs";
import type {
    RestArgs,
    RestHandle,
    RestResponse,
    RestTransforms,
    RouteArgs,
    UseTransform,
    UseTransformAsync,
} from "./interfaces.mjs";

/**
 * Starts a typed route for an application.
 *
 * Chain `use` to add request transforms, `as` to set a response schema, then one method call to register the handler.
 * @category http
 * @example export default route({app, name: "Get a User"}).use({args: useParams(Params)}).get(handle)
 */
export function route<TContext, TProto extends ProtoAbstract<ServeInput>>(
    args: RouteArgs<TContext, TProto>,
): Router<TContext, {}, RestResponse> {
    return new Router<TContext, RestTransforms, RestResponse>(args, {});
}

/**
 * Binds an application once and returns a builder that only needs each route's metadata.
 * @category http
 */
export function rest<TContext, TProto extends ProtoAbstract<ServeInput>>(
    args: RestArgs<TContext, TProto>,
): RestHandle<TContext> {
    return (meta: Meta): Router<TContext, {}, RestResponse> => route({...args, ...meta});
}

/**
 * A transform that validates the query string against a schema.
 * @category http
 */
export function useQuery<S extends ZodObject>(transform: S): UseTransform<S> {
    return ({request}) => {
        const {searchParams} = new URL(request.url);
        const rec = Object.fromEntries(searchParams.entries());

        return z.parse(transform, rec);
    };
}

/**
 * A transform that validates the route parameters, such as `[id]`, against a schema.
 * @category http
 */
export function useParams<S extends ZodType>(transform: S): UseTransform<S> {
    return ({route}) => {
        return z.parse(transform, route.params);
    };
}

/**
 * A transform that validates the request itself against a schema.
 * @category http
 */
export function useRequest<S extends ZodType<Request>>(transform: S): UseTransform<S> {
    return ({request}) => {
        return z.parse(transform, request);
    };
}

/**
 * An async transform that validates the request itself against a schema.
 * @category http
 */
export function useRequestAsync<S extends ZodType<Request>>(transform: S): UseTransformAsync<S> {
    return ({request}) => {
        return z.parseAsync(transform, request);
    };
}

/**
 * A transform that reads and validates the request body.
 * @category http
 * @example useBody(request.Json.pipe(UserUpdateType))
 */
export function useBody<S extends ZodType<unknown, Request>>(schema: S): Fn<[ServeInput], Promise<z.output<S>>> {
    return ({request}) => {
        return z.parseAsync(schema, request);
    };
}
