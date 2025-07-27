import {assert} from "@typesec/core";
import {object, type KeyOf, type Promisify} from "@typesec/the";
import type {Args, Graph, Node, Proto} from "../interfaces.mts";

export class ArgsResolver<A extends Args<any>> {
    readonly #node: Proto.ArgsNode<any, A>;

    constructor(node: Proto.ArgsNode<any, A>) {
        this.#node = node;
    }

    public async resolve(payload: unknown): Promise<Graph.Extract<A>> {
        assert(object.isObject(payload), `ARG_RESOLVER_WRONG_PAYLOAD`);

        const result = {} as Graph.Extract<A>;
        for (const key of this.#node.keys()) {
            const member = this.#node.members[key];
            const value = await this.#resolveType(member, payload[key]);
            Object.assign(result, {[key]: value});
        }

        return result;
    }

    async #resolveType<K extends KeyOf<A, string>>({type}: Node.MakeArgs<A>[K], payload: unknown): Promise<any> {
        switch (type.kind) {
            case "args":
                return this.#resolveArgs(type, payload);

            case "complex":
                return this.#resolveComplex(type, payload);

            case "null":
            case "array":
                return this.#resolveComposite(type, payload);

            case "primitive":
                return this.#resolvePrimitive(type, payload);
        }
    }

    async #resolvePrimitive<T extends Graph.Primitive>(type: Proto.Primitive<any, T>, payload: unknown): Promise<T> {
        assert(type.validate(payload), `Wrong ${type.name} primitive`);

        return payload;
    }

    async #resolveComposite<P extends Proto.Composite<any, any, any>>(
        type: P,
        payload: unknown,
    ): Promise<Graph.Extract<A>> {
        assert(type.validate(payload), `Wrong composite value`);

        return payload;
    }

    async #resolveArgs<T extends Proto.ArgsNode<any, any>>(type: T, payload: unknown): Promise<Graph.Extract<T>> {
        const resolver = new ArgsResolver(type);

        const result = await resolver.resolve(payload);
        assert(type.validate(result), `${type.name} Validation failed`);

        return result;
    }

    #resolveComplex<T>(type: Proto.Complex<any, T, any>, payload: unknown): Promisify<T> {
        assert(Array.isArray(payload), `Wrong format`);
        const [id, serialized] = payload;

        assert(id === type.name, `Wrong format identifier`);
        assert(type.format.validate(serialized), `Wrong serialized data`);

        return type.deserialize(serialized);
    }
}
