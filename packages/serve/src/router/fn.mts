import type {Fn, Rec} from "@typesec/the";
import type {Meta, ProtoAbstract} from "@typesec/unit";
import {parse, parseAsync, type BaseSchema, type BaseSchemaAsync, type InferOutput} from "valibot";
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

export function useQuery<S extends BaseSchema<Rec, any, any>>(transform: S): UseTransform<S> {
    return ({request}) => {
        const {searchParams} = new URL(request.url);
        const rec = Object.fromEntries(searchParams.entries());

        return parse(transform, rec);
    };
}

export function useParams<S extends BaseSchema<Rec, any, any>>(transform: S): UseTransform<S> {
    return ({route}) => {
        return parse(transform, route.params);
    };
}

export function useRequest<S extends BaseSchema<Request, any, any>>(transform: S): UseTransform<S> {
    return ({request}) => {
        return parse(transform, request);
    };
}

export function useRequestAsync<S extends BaseSchemaAsync<Request, any, any>>(transform: S): UseTransformAsync<S> {
    return ({request}) => {
        return parseAsync(transform, request);
    };
}

export function useBody<S extends BaseSchemaAsync<Request, any, any>>(
    schema: S,
): Fn<[ServeInput], Promise<InferOutput<S>>> {
    return ({request}) => {
        return parseAsync(schema, request);
    };
}
