import {locator} from "@typesec/core";
import {override, type Override} from "@typesec/the";
import type {Application, Handle, HandleEntry, Meta, ProtoAbstract} from "@typesec/unit";
import {z} from "zod";
import {type ServeInput, type ServeProto} from "../index.mjs";
import {RestProto} from "./RestProto.mjs";
import type {RestOnError, RestTransforms, RouteArgs} from "./interfaces.mjs";

/**
 * Builds one route, accumulating its transforms and response type in the type as it goes.
 *
 * `use` widens what `proto.parse` accepts, `as` fixes the value a handler must return, and a method call registers the handler as the file's entrypoint.
 * @category http
 */
export class Router<TContext, TTransforms extends RestTransforms = {}, TRet = Response> {
    readonly #meta: Meta;
    readonly #app: Application<TContext, ProtoAbstract<ServeInput>, ServeInput, Response>;
    readonly #map: TTransforms;
    readonly #as?: z.ZodType;
    readonly #error?: RestOnError;

    constructor({app, error, ...meta}: RouteArgs<TContext>, map: TTransforms, as?: z.ZodType) {
        this.#app = app;
        this.#error = error;
        this.#meta = meta;
        this.#map = map;
        this.#as = as;
    }

    /** Metadata this route was declared with. */
    public get meta(): Meta {
        return this.#meta;
    }

    /** The transforms declared so far. */
    public get map(): Partial<TTransforms> {
        return this.#map;
    }

    /** Adds named request transforms, which the handler then reaches through `proto.parse`. */
    public use<S extends RestTransforms>(rest: S): Router<TContext, Override<TTransforms, S>, TRet> {
        return new Router<TContext, Override<TTransforms, S>, TRet>(
            {app: this.#app, error: this.#error, ...this.#meta},
            override(this.#map, rest),
            this.#as,
        );
    }

    /** Sets the schema the handler's return value is validated and converted by. */
    public as<S extends z.ZodType>(as: S): Router<TContext, TTransforms, z.input<S>> {
        return new Router<TContext, TTransforms, z.input<S>>(
            {app: this.#app, error: this.#error, ...this.#meta},
            this.#map,
            as,
        );
    }

    /** Registers the handler for GET. */
    public get<TProto extends RestProto<TTransforms>>(
        handle: Handle<TContext, TProto, ServeInput, TRet>,
    ): HandleEntry<ServeProto, ServeInput, Response> {
        return this.#app({
            ...this.#meta,
            handle: this.#wrap(async ({context, request}) => {
                const proto = new RestProto<TTransforms>(request, this.#map) as TProto;

                const response = await handle({
                    context,
                    request,
                    proto,
                });

                return this.#as ? z.parse(this.#as, response) : (new Response(`${response}`) as any);
            }),
        });
    }

    /** Registers the handler for POST. */
    public post<TProto extends RestProto<TTransforms>>(
        handle: Handle<TContext, TProto, ServeInput, TRet>,
    ): HandleEntry<ServeProto, ServeInput, Response> {
        return this.#app({
            ...this.#meta,
            handle: this.#wrap(async ({context, request}) => {
                const proto = new RestProto<TTransforms>(request, this.#map) as TProto;

                const response = await handle({
                    context,
                    request,
                    proto,
                });

                return this.#as ? z.parse(this.#as, response) : (new Response(`${response}`) as any);
            }),
        });
    }

    /** Registers the handler for PUT. */
    public put<TProto extends RestProto<TTransforms>>(
        handle: Handle<TContext, TProto, ServeInput, TRet>,
    ): HandleEntry<ServeProto, ServeInput, Response> {
        return this.post(handle);
    }

    /** Registers the handler for PATCH. */
    public patch<TProto extends RestProto<TTransforms>>(
        handle: Handle<TContext, TProto, ServeInput, TRet>,
    ): HandleEntry<ServeProto, ServeInput, Response> {
        return this.post(handle);
    }

    /** Registers the handler for DELETE. */
    public delete<TProto extends RestProto<TTransforms>>(
        handle: Handle<TContext, TProto, ServeInput, TRet>,
    ): HandleEntry<ServeProto, ServeInput, Response> {
        return this.post(handle);
    }

    #wrap(
        handle: Handle<TContext, ProtoAbstract<ServeInput>, ServeInput, Response>,
    ): Handle<TContext, ProtoAbstract<ServeInput>, ServeInput, Response> {
        return async (...args) => {
            try {
                return await locator(function wrapOnErrorServiceLocate() {
                    return handle(...args);
                });
            } catch (reason) {
                if (this.#error) {
                    return this.#error(reason);
                }

                throw reason;
            }
        };
    }
}
