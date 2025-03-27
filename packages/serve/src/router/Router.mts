import type {Application, Handle, HandleEntry, Meta, ProtoAbstract} from "@typesec/unit";
import {parse, type BaseSchema, type InferInput} from "valibot";
import {type ServeInput, type ServeProto} from "../index.mjs";
import {RestProto} from "./RestProto.mjs";
import type {ExtendSchema, RestResponse, RestSchema, RouteArgs} from "./interfaces.mjs";

export class Router<TContext, TRest extends RestSchema, TRet extends RestResponse> {
    readonly #app: Application<TContext, ProtoAbstract<ServeInput>, ServeInput, Response>;
    readonly #meta: Meta;
    readonly #map: TRest;
    readonly #as?: BaseSchema<any, any, any>;

    constructor({app, ...meta}: RouteArgs<TContext>, map: TRest, as?: BaseSchema<any, any, any>) {
        this.#app = app;
        this.#meta = meta;
        this.#map = map;
        this.#as = as;
    }

    public get map(): Partial<TRest> {
        return this.#map;
    }

    public use<S extends Partial<RestSchema>>(rest: S): Router<TContext, ExtendSchema<TRest, S>, TRet> {
        return new Router<TContext, ExtendSchema<TRest, S>, TRet>(
            {app: this.#app, ...this.#meta},
            {
                ...this.#map,
                ...rest,
            } as ExtendSchema<TRest, S>,
            this.#as,
        );
    }

    public as<S extends BaseSchema<any, any, any>>(as: S): Router<TContext, TRest, InferInput<S>> {
        return new Router<TContext, TRest, InferInput<S>>({app: this.#app, ...this.#meta}, this.#map, as);
    }

    public get<TProto extends RestProto<TRest>>(
        handle: Handle<TContext, TProto, ServeInput, TRet>,
    ): HandleEntry<ServeProto, ServeInput, Response> {
        return this.#app({
            ...this.#meta,
            handle: async ({context, request}) => {
                const proto = new RestProto<TRest>(request, this.#map) as TProto;

                const response = await handle({
                    context,
                    request,
                    proto,
                });

                return this.#as ? parse(this.#as, response) : new Response(`${response}`);
            },
        });
    }

    public post<TProto extends RestProto<TRest>>(
        handle: Handle<TContext, TProto, ServeInput, TRet>,
    ): HandleEntry<ServeProto, ServeInput, Response> {
        return this.#app({
            ...this.#meta,
            handle: async ({context, request}) => {
                const proto = new RestProto<TRest>(request, this.#map) as TProto;

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
