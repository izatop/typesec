import {parseAsync, type BaseSchemaAsync, type InferOutput} from "valibot";
import type {Fn, Rec} from "../../../the/src/interfaces.mjs";
import type {ServeInput} from "../index.mjs";

export function useQuery<R>(fn: Fn<[Rec], R>): Fn<[ServeInput], R> {
    return ({request}) => {
        const {searchParams} = new URL(request.url);

        return fn(Object.fromEntries(searchParams.entries()));
    };
}

export function useParams<R>(fn: Fn<[Rec], R>): Fn<[ServeInput], R> {
    return ({route}) => {
        return fn(route.params);
    };
}

export function useRequest<R>(fn: Fn<[Request], R>): Fn<[ServeInput], R> {
    return ({request}) => {
        return fn(request);
    };
}

export function useBody<S extends BaseSchemaAsync<Request, any, any>>(
    schema: S,
): Fn<[ServeInput], Promise<InferOutput<S>>> {
    return ({request}) => {
        return parseAsync(schema, request);
    };
}
