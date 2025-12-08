import {assert, fn, object, type Fn, type Fnify, type Promisify, type Rec} from "@typesec/the";
import {construct, crush} from "radash";
import type {Domain, Implementation, StaticResolvers} from "../interfaces.mts";
import {Procedure} from "./Procedure.mts";

export class Backend<
    TContext,
    TDomain extends Domain<any, any>,
    TImpl extends Implementation<TContext, Domain.Infer<TDomain>>,
> {
    readonly #domain: TDomain;
    readonly #impl: TImpl;
    readonly #procedures: Rec<string, Procedure<TContext, any, any>>;

    constructor(domain: TDomain, impl: TImpl) {
        this.#domain = domain;
        this.#impl = impl;
        this.#procedures = crush(this.#impl) as Rec<string, Procedure<TContext, any, any>>;
    }

    public get implementation(): TImpl {
        return this.#impl;
    }

    public get domain(): TDomain {
        return this.#domain;
    }

    public async execute(context: TContext, query: unknown): Promise<Rec<string, unknown>> {
        return construct(await this.#deepRun(context, query)) as Rec<string, unknown>;
    }

    public async execute2(context: TContext, query: unknown): Promise<Rec<string, unknown>> {
        const entries: [string, Promise<unknown>][] = [];

        for (const op of this.#deepQuery(context, query)) {
            entries.push(op);
        }

        return construct(await object.fromAsyncEntries(entries)) as Rec<string, unknown>;
    }

    *#deepQuery(context: TContext, query: unknown, prev?: string): Generator<[path: string, value: Promise<unknown>]> {
        assert(object.isPlain(query), "Wrong query");

        for (const [key, subquery] of Object.entries(query)) {
            const next = prev ? prev.concat(".", key) : key;
            if (Array.isArray(subquery)) {
                const proc = this.#procedures[next];
                assert(proc instanceof Procedure, `Unknown path ${key}, query failed`);
                yield [next, proc.encode(subquery[0], context).then((res) => res ?? null)];

                continue;
            }

            for (const op of this.#deepQuery(context, subquery, next)) {
                yield op;
            }
        }
    }

    async #deepRun(context: TContext, query: unknown, prev?: string): Promise<Rec> {
        assert(object.isPlain(query), "Wrong query");
        const res: Rec = {};

        for (const [key, subquery] of Object.entries(query)) {
            const next = prev ? prev.concat(".", key) : key;
            if (Array.isArray(subquery)) {
                const proc = this.#procedures[next];
                assert(proc instanceof Procedure, `Unknown path ${key}, query failed`);
                res[next] = await proc.encode(subquery[0], context).then((res) => res ?? null);

                continue;
            }

            Object.assign(res, await this.#deepRun(context, subquery, next));
        }

        return res;
    }

    async #run(proc: any, arg1: any, arg2: any): Promise<any> {
        return await proc.encode(arg1, arg2).then((res: any) => res ?? null);
    }

    public createStatic(context: TContext | Fn<[], Promisify<TContext>>): StaticResolvers<TImpl> {
        return this.#createStaticResolvers(context, this.#impl);
    }

    #createStaticResolvers(context: Fnify<Promisify<TContext>>, impl: Rec): StaticResolvers<TImpl> {
        const resolvers: Rec = {};
        const resolveContext = this.#createContextResolver(context);
        for (const [key, value] of object.toEntries(impl)) {
            if (value instanceof Procedure) {
                resolvers[key] = async (input: unknown) => value.run(input, await resolveContext());

                continue;
            }

            assert(object.isPlain(value), "Wrong node");
            resolvers[key] = this.#createStaticResolvers(context, value);
        }

        return resolvers as StaticResolvers<TImpl>;
    }

    #createContextResolver(context: Fnify<Promisify<TContext>>): Fn<[], Promisify<TContext>> {
        return fn.is(context, "function") ? context : () => context;
    }
}
