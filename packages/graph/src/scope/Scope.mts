import {is, type IsNever, type Promisify, type Rec} from "@typesec/the";
import type {Graph, Node, Proto, Query} from "../interfaces.mts";
import {Subquery} from "../query/Subquery.mts";

export class Scope<G extends Graph<any>, S extends Rec, C> {
    readonly #node: Proto.GraphNode<any, G, S, C>;
    readonly #source: Node.ScopeResolve<S, C>;

    constructor(node: Proto.GraphNode<any, G, S, C>, resolver: Node.ScopeResolve<S, C>) {
        this.#node = node;
        this.#source = resolver;
    }

    public get node(): Proto.GraphNode<any, G, S, C> {
        return this.#node;
    }

    public resolve(context: Node.ResolverContext<C>): Promisify<S> {
        return is(this.#source, "function") ? this.#source(context) : this.#source;
    }

    public async query<Q extends Query<G>>(...[query, context]: ScopeQueryArgs<Q, C>): Promise<Query.Result<G, Q>> {
        const source = await this.resolve({context});
        const queue = new Subquery(this.#node, source, context as C);

        return queue.query(query);
    }
}

export type ScopeQueryArgs<Q extends Query<any>, C> = IsNever<C> extends true ? [query: Q] : [query: Q, context: C];
