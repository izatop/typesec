import {assert, object, type Rec} from "@typesec/the";
import z from "zod";
import type {ClientQuery, ClientResult} from "../index.mts";
import type {Domain, IClientProtocol} from "../interfaces.mts";
import {ClientError} from "./ClientError.mts";
import {ClientLazyQuery} from "./ClientLazyQuery.mts";
import {Contract} from "./Contract.mts";

export class Client<TDomain extends Domain<string, Rec<string, unknown>>> {
    readonly #protocol: IClientProtocol;
    readonly #domain: TDomain;

    constructor(domain: TDomain, protocol: IClientProtocol) {
        this.#domain = domain;
        this.#protocol = protocol;
    }

    public async query<Q extends ClientQuery<Domain.Infer<TDomain>>>(
        query: Q,
    ): Promise<ClientResult<Domain.Infer<TDomain>, Q>> {
        const response = await this.#protocol.query({
            query: this.#encode(this.#domain.root, query),
        });

        if (response.reason) {
            throw new ClientError(response.code, response.reason);
        }

        return this.#decode(this.#domain.root, response.data) as ClientResult<Domain.Infer<TDomain>, Q>;
    }

    public lazy<Q extends ClientQuery<Domain.Infer<TDomain>>>(query: Q): ClientLazyQuery<TDomain, Q> {
        return new ClientLazyQuery(this, query);
    }

    #encode(node: unknown, input: unknown): unknown {
        if (object.isPlain(node) && object.isPlain(input)) {
            return object.reverseEntries<Rec>(
                object
                    .toEntries<Rec<string, unknown>>(input)
                    .map(([key, value]) => [key, this.#encode(node[key], value)]),
            );
        }

        assert(node instanceof Contract, "Wrong query");

        return z.encode(z.tuple([node.config.input]), input as [unknown]);
    }

    #decode(node: unknown, output: unknown): Rec<string, unknown> {
        if (object.isPlain(node) && object.isPlain(output)) {
            return object.reverseEntries<Rec>(
                object
                    .toEntries<Rec<string, unknown>>(output)
                    .map(([key, value]) => [key, this.#decode(node[key], value)]),
            );
        }

        assert(node instanceof Contract, "Wrong query");

        return z.parse(node.config.output, output);
    }
}
