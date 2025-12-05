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

export function route<TContext, TProto extends ProtoAbstract<ServeInput>>(
    args: RouteArgs<TContext, TProto>,
): Router<TContext, {}, RestResponse> {
    return new Router<TContext, RestTransforms, RestResponse>(args, {});
}

export function rest<TContext, TProto extends ProtoAbstract<ServeInput>>(
    args: RestArgs<TContext, TProto>,
): RestHandle<TContext> {
    return (meta: Meta): Router<TContext, {}, RestResponse> => route({...args, ...meta});
}

export function useQuery<S extends ZodObject>(transform: S): UseTransform<S> {
    return ({request}) => {
        const {searchParams} = new URL(request.url);
        const rec = Object.fromEntries(searchParams.entries());

        return z.parse(transform, rec);
    };
}

export function useParams<S extends ZodType>(transform: S): UseTransform<S> {
    return ({route}) => {
        return z.parse(transform, route.params);
    };
}

export function useRequest<S extends ZodType<Request>>(transform: S): UseTransform<S> {
    return ({request}) => {
        return z.parse(transform, request);
    };
}

export function useRequestAsync<S extends ZodType<Request>>(transform: S): UseTransformAsync<S> {
    return ({request}) => {
        return z.parseAsync(transform, request);
    };
}

export function useBody<S extends ZodType<unknown, Request>>(schema: S): Fn<[ServeInput], Promise<z.output<S>>> {
    return ({request}) => {
        return z.parseAsync(schema, request);
    };
}
