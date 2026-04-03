import {type Rec} from "@typesec/the";
import type {ClientQuery, ClientResult} from "../index.mjs";
import type {Domain} from "../interfaces.mjs";
import type {Client} from "./Client.mjs";

export class ClientLazyQuery<
    TDomain extends Domain<string, Rec<string, unknown>>,
    Q extends ClientQuery<Domain.Infer<TDomain>>,
> {
    readonly #client: Client<TDomain>;

    readonly #query: Q;

    constructor(client: Client<TDomain>, query: Q) {
        this.#client = client;
        this.#query = query;
    }

    public query(): Promise<ClientResult<Domain.Infer<TDomain>, Q>> {
        return this.#client.query(this.#query);
    }
}
