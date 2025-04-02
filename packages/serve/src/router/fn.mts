import {isFunction} from "@typesec/the";
import {parse, parseAsync, type BaseSchema, type BaseSchemaAsync, type InferOutput} from "valibot";
import type {Fn, Rec} from "../../../the/src/interfaces.mjs";
import type {ServeInput} from "../index.mjs";

export type ServeInputTransform<I = Rec, R = unknown> = Fn<[I], R> | BaseSchema<I, any, any>;

export function useQuery<R>(transform: ServeInputTransform<Rec, R>): Fn<[ServeInput], R> {
    return ({request}) => {
        const {searchParams} = new URL(request.url);
        const rec = Object.fromEntries(searchParams.entries());

        return isFunction(transform) ? transform(rec) : parse(transform, rec);
    };
}

export function useParams<R>(transform: ServeInputTransform<Rec, R>): Fn<[ServeInput], R> {
    return ({route}) => {
        return isFunction(transform) ? transform(route.params) : parse(transform, route.params);
    };
}

export function useRequest<R>(transform: ServeInputTransform<Request, R>): Fn<[ServeInput], R> {
    return ({request}) => {
        return isFunction(transform) ? transform(request) : parse(transform, request);
    };
}

export function useBody<S extends BaseSchemaAsync<Request, any, any>>(
    schema: S,
): Fn<[ServeInput], Promise<InferOutput<S>>> {
    return ({request}) => {
        return parseAsync(schema, request);
    };
}
