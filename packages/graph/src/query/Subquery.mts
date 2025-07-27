import {assert} from "@typesec/core";
import {
    defnify,
    fromAsyncEntries,
    is,
    isNullable,
    object,
    toEntries,
    type Fn,
    type KeyOf,
    type Promisify,
    type Rec,
} from "@typesec/the";
import {ArgsResolver} from "../args/ArgsResolver.mts";
import type {Graph, Node, Proto, Query} from "../interfaces.mts";
import {isProto} from "../proto.mts";

export type QueryNodeDataset<T> =
    | {state: "created"; value: Fn<[], Promisify<T>>}
    | {state: "pending"; value: Promise<T>}
    | {state: "resolved"; value: T}
    | {state: "error"; value: unknown};

export class Subquery<G extends Graph<any>, S extends Rec, C> {
    readonly #node: Proto.GraphNode<any, G, S, C>;
    readonly #source: S;
    readonly #context: C;
    readonly #dataset: Rec<string, QueryNodeDataset<any> | [alias: string, state: QueryNodeDataset<any>][]>;

    constructor(node: Proto.GraphNode<any, G, S, C>, source: S, context: C) {
        this.#node = node;
        this.#source = source;
        this.#context = context;
        this.#dataset = {};
    }

    public query<Q extends Query<G>>(query: Q): Promise<Query.Result<G, Q>> {
        for (const key of object.keys(query, "string")) {
            this.#enqueue(query, key);
        }

        return this.#flush(query);
    }

    #enqueue<Q extends Query<G>, K extends KeyOf<Q, string>>(query: Q, key: K) {
        const queue: [key: string, state: QueryNodeDataset<any>][] = [];
        for (const [alias, selector] of this.#getSelectorList(query, key)) {
            assert(this.#node.has(key), `QUERY_UNKNOWN_KEY: ${key}`);
            queue.push([alias, {state: "created", value: this.#createFactory(key, selector)}]);
        }

        const [[, state] = []] = queue;
        if (queue.length === 1 && state) {
            this.#dataset[key] = state;
        } else {
            this.#dataset[key] = {
                state: "created",
                value: () => {
                    return fromAsyncEntries(
                        queue.map(([alias, state]) => [alias, this.#resolve(`${key}.${alias}`, state)]),
                    );
                },
            };
        }
    }

    #getSelectorList<Q extends Query<G>, K extends KeyOf<Q, string>>(
        query: Q,
        key: K,
    ): [key: string, selector: Query.Selector<G, any>][] {
        const selector = query[key];
        if (object.isObject(selector)) {
            return toEntries(selector);
        }

        return [[key, selector ?? 0]];
    }

    #createFactory<Q extends Query<G>, K extends KeyOf<G, string>>(
        key: K,
        selector: Query.Selector<G, any>,
    ): Fn<[], Promisify<Query.ResultNode<G, K, Q[K]> | null>> {
        assert(this.#node.has(key), `Wrong node ${this.#node.name}.${key}`);
        const member = this.#node.members[key];
        if (!selector) {
            return () => null;
        }

        const type = defnify(member.type);
        const proto = (type === "self" ? this.#node : type) as Proto.All;
        assert(isProto(proto), `${this.#node.name}.${key} type should be a proto`);
        const args = this.#createArgsFactory(member, selector);

        return async () => {
            const value = is(member.resolve, "function")
                ? await member.resolve({
                      args: await args?.(),
                      value: this.#source[key],
                      parent: this.#source,
                      context: this.#context,
                      subquery: new Subquery(this.#node, this.#source, this.#context),
                  })
                : this.#source[key];

            return this.#resolveField(proto, selector, value);
        };
    }

    async #resolveField(proto: Proto.All, selector: Query.Selector<any, any>, payload: any): Promise<any> {
        if (proto.kind === "graph") {
            const q = new Subquery(proto as Proto.GraphNode<any, any, any, C>, payload, this.#context);
            assert(this.#getSubquerySelector(selector), `${proto.name}: Wrong selector ${selector}`);

            return q.query(selector[0]);
        }

        if (proto.kind === "array") {
            assert(Array.isArray(payload), `Wrong array`);

            return Promise.all(payload.map((item) => this.#resolveField(proto.child, selector, item)));
        }

        if (proto.kind === "null") {
            return isNullable(payload) ? this.#resolveField(proto.child, selector, payload) : null;
        }

        assert(proto.validate(payload), "Wrong value");

        return payload;
    }

    #getSubquerySelector(selector: Query.Selector<any, any>): selector is Query.GraphSelector<any> {
        return Array.isArray(selector) && selector.length > 0;
    }

    #createArgsFactory<K extends KeyOf<G, string>>(
        member: Node.Member<any, G, K, S, C>,
        selector: Query.Selector<G, any>,
    ): Fn<[], Promisify<Node.ExtractArgs<G, K>>> {
        const resolver = () => {
            if (object.has(member, "args")) {
                assert(this.#isArgs(member.args), "QUERY_WRONG_ARGS");
                assert(Array.isArray(selector), `QUERY_SHOULD_ARRAY_SELECTOR`);

                const type: Proto.Kind = member.type;
                const args = new ArgsResolver(member.args);

                return args.resolve(type === "graph" ? selector[1] : selector[0]);
            }

            return null;
        };

        return resolver as Fn<[], Promisify<Node.ExtractArgs<G, K>>>;
    }

    async #flush<Q extends Query<G>>(query: Q): Promise<Query.Result<G, Q>> {
        return fromAsyncEntries(
            object.keys(query, "string").map((key) => [key, this.#resolveKey(key)]),
        ) as unknown as Promise<Query.Result<G, Q>>;
    }

    async #resolveKey(key: string): Promise<any> {
        const data = this.#dataset[key];
        assert(object.isObject(data), `Wrong key ${key} of a query cache`);
        if (Array.isArray(data)) {
            return fromAsyncEntries(data.map(([key, state]) => [key, this.#resolve(key, state)]));
        }

        return this.#resolve(key, data);
    }

    #resolve<T>(key: string, data: QueryNodeDataset<T>): Promisify<T> {
        switch (data.state) {
            case "created":
                return this.#ready(key, data.value);

            case "pending":
            case "resolved":
                return data.value;

            case "error":
                throw data.value;
        }
    }

    #ready<T>(key: string, factory: Fn<[], Promisify<T>>) {
        try {
            const pending = Promise.resolve(factory());
            this.#dataset[key] = {
                state: "pending",
                value: pending.then(
                    (resolved) => {
                        this.#dataset[key] = {
                            value: resolved,
                            state: "resolved",
                        };

                        return resolved;
                    },
                    (error) => {
                        this.#dataset[key] = {
                            value: error,
                            state: "error",
                        };
                    },
                ),
            };

            return pending;
        } catch (error) {
            this.#dataset[key] = {
                value: error,
                state: "error",
            };

            return Promise.reject(error);
        }
    }

    #isArgs<K extends KeyOf<G, string>>(value: unknown): value is Proto.ArgsNode<any, G[K]> {
        return isProto(value);
    }
}
