import type {IProto} from "@typesec/unit";
import {never} from "valibot";
import type {ServeInput} from "../index.mjs";
import {Router} from "./Router.mjs";
import type {RestResponse, RestSchema, RouteArgs} from "./interfaces.mjs";

export function route<TContext, TProto extends IProto<ServeInput>>(
    args: RouteArgs<TContext, TProto>,
): Router<TContext, RestSchema, RestResponse> {
    return new Router<TContext, RestSchema, RestResponse>(args, {body: never(), params: never(), query: never()});
}
