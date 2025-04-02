import {override, type Override} from "@typesec/the";
import type {Application, Handle, HandleEntry, Meta, ProtoAbstract} from "@typesec/unit";
import {parse, type BaseSchema, type InferInput} from "valibot";
import {type ServeInput, type ServeProto} from "../index.mjs";
import {RestProto} from "./RestProto.mjs";
import type {RestResponse, RestTransforms, RouteArgs} from "./interfaces.mjs";

export class Router<TContext, TTransforms extends RestTransforms = {}, TRet extends RestResponse = RestResponse> {
    readonly #app: Application<TContext, ProtoAbstract<ServeInput>, ServeInput, Response>;
    readonly #meta: Meta;
    readonly #map: TTransforms;
    readonly #as?: BaseSchema<any, any, any>;

    constructor({app, ...meta}: RouteArgs<TContext>, map: TTransforms, as?: BaseSchema<any, any, any>) {
        this.#app = app;
        this.#meta = meta;
        this.#map = map;
        this.#as = as;
    }

    public get map(): Partial<TTransforms> {
        return this.#map;
    }

    public use<S extends RestTransforms>(rest: S): Router<TContext, Override<TTransforms, S>, TRet> {
        return new Router<TContext, Override<TTransforms, S>, TRet>(
            {app: this.#app, ...this.#meta},
            override(this.#map, rest),
            this.#as,
        );
    }

    public as<S extends BaseSchema<any, any, any>>(as: S): Router<TContext, TTransforms, InferInput<S>> {
        return new Router<TContext, TTransforms, InferInput<S>>({app: this.#app, ...this.#meta}, this.#map, as);
    }

    public get<TProto extends RestProto<TTransforms>>(
        handle: Handle<TContext, TProto, ServeInput, TRet>,
    ): HandleEntry<ServeProto, ServeInput, Response> {
        return this.#app({
            ...this.#meta,
            handle: async ({context, request}) => {
                const proto = new RestProto<TTransforms>(request, this.#map) as TProto;

                const response = await handle({
                    context,
                    request,
                    proto,
                });

                return this.#as ? parse(this.#as, response) : new Response(`${response}`);
            },
        });
    }

    public post<TProto extends RestProto<TTransforms>>(
        handle: Handle<TContext, TProto, ServeInput, TRet>,
    ): HandleEntry<ServeProto, ServeInput, Response> {
        return this.#app({
            ...this.#meta,
            handle: async ({context, request}) => {
                const proto = new RestProto<TTransforms>(request, this.#map) as TProto;

                const response = await handle({
                    context,
                    request,
                    proto,
                });

                return this.#as ? parse(this.#as, response) : new Response(`${response}`);
            },
        });
    }
}
