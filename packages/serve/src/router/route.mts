import type {ProtoAbstract} from "@typesec/unit";
import type {ServeInput} from "../index.mjs";
import {Router} from "./Router.mjs";
import type {RestResponse, RestTransforms, RouteArgs} from "./interfaces.mjs";

export function route<TContext, TProto extends ProtoAbstract<ServeInput>>(
    args: RouteArgs<TContext, TProto>,
): Router<TContext, {}, RestResponse> {
    return new Router<TContext, RestTransforms, RestResponse>(args, {});
}
