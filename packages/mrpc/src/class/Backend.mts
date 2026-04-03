import {assert, fn, object, type Fn, type Promisify, type Rec} from "@typesec/the";
import {construct, crush} from "radash";
import type {ClientQuery, ClientResult} from "../index.mjs";
import type {Domain, Implementation, StaticResolvers} from "../interfaces.mjs";
import {ProcedureAbstract} from "./ProcedureAbstract.mjs";
import {ProcedureAsync} from "./ProcedureAsync.mjs";

export class Backend<
    TContext,
    TDomain extends Domain<any, any>,
    TImpl extends Implementation<TContext, Domain.Infer<TDomain>>,
> {
    readonly #domain: TDomain;
    readonly #impl: TImpl;
    readonly #procedures: Rec<string, ProcedureAsync<TContext, any, any>>;

    constructor(domain: TDomain, impl: TImpl) {
        this.#domain = domain;
        this.#impl = impl;
        this.#procedures = crush(this.#impl) as Rec<string, ProcedureAsync<TContext, any, any>>;
    }

    public get implementation(): TImpl {
        return this.#impl;
    }

    public get domain(): TDomain {
        return this.#domain;
    }

    public async execute(context: TContext, query: unknown): Promise<Rec<string, unknown>> {
        return construct(await this.#deepExecuteAndEncode(context, query)) as Rec<string, unknown>;
    }

    public async query<Q extends ClientQuery<Domain.Infer<TDomain>>>(
        context: TContext,
        query: Q,
    ): Promise<ClientResult<Domain.Infer<TDomain>, Q>> {
        return this.#deepQuery(context, query) as Promise<ClientResult<Domain.Infer<TDomain>, Q>>;
    }

    async #deepExecuteAndEncode(context: TContext, query: unknown, prev?: string): Promise<Rec> {
        assert(object.isPlain(query), "Wrong query");
        const res: Rec = {};

        for (const [key, subquery] of Object.entries(query)) {
            const next = prev ? prev.concat(".", key) : key;
            if (Array.isArray(subquery)) {
                const proc = this.#procedures[next];
                assert(proc instanceof ProcedureAbstract, `Unknown path ${key}, query failed`);
                res[next] = await proc.encode(context, subquery[0]);
                if (fn.is(res[next], "undefined")) {
                    res[next] = null;
                }

                continue;
            }

            Object.assign(res, await this.#deepExecuteAndEncode(context, subquery, next));
        }

        return res;
    }

    async #deepQuery(context: TContext, query: unknown, prev?: string): Promise<Rec> {
        assert(object.isPlain(query), "Wrong query");
        const res: Rec = {};

        for (const [key, subquery] of Object.entries(query)) {
            const next = prev ? prev.concat(".", key) : key;
            if (Array.isArray(subquery)) {
                const proc = this.#procedures[next];
                assert(proc instanceof ProcedureAbstract, `Unknown path ${key}, query failed`);
                res[next] = await proc.run(context, subquery[0]);
                if (fn.is(res[next], "undefined")) {
                    res[next] = null;
                }

                continue;
            }

            Object.assign(res, await this.#deepQuery(context, subquery, next));
        }

        return res;
    }

    public createStatic(context: TContext): StaticResolvers<TImpl>;
    public createStatic(context: Fn<[], Promise<TContext>>): Promise<StaticResolvers<TImpl>>;
    public createStatic(context: TContext | Fn<[], Promise<TContext>>): Promisify<StaticResolvers<TImpl>> {
        if (fn.is(context, "function")) {
            return context().then((ctx) => this.#createStaticResolvers(ctx, this.#impl));
        }

        return this.#createStaticResolvers(context, this.#impl);
    }

    #createStaticResolvers(context: TContext, impl: Rec): StaticResolvers<TImpl> {
        const resolvers: Rec = {};

        for (const [key, value] of object.toEntries(impl)) {
            if (value instanceof ProcedureAbstract) {
                resolvers[key] = (input: unknown) => value.run(context, input);

                continue;
            }

            assert(object.isPlain(value), "Wrong node");
            resolvers[key] = this.#createStaticResolvers(context, value);
        }

        return resolvers as StaticResolvers<TImpl>;
    }
}
