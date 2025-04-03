import {parse, parseAsync, type BaseSchema, type BaseSchemaAsync, type InferOutput} from "valibot";
import type {Fn, Rec} from "../../../the/src/interfaces.mjs";
import type {ServeInput} from "../index.mjs";

export type UseTransform<S extends BaseSchema<any, any, any>> = Fn<[ServeInput], InferOutput<S>>;
export type UseTransformAsync<S extends BaseSchemaAsync<any, any, any>> = Fn<[ServeInput], Promise<InferOutput<S>>>;

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
