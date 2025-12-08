import {type Rec} from "@typesec/the";
import type {ClientQuery, ClientResult} from "../index.mts";
import type {Domain} from "../interfaces.mts";
import type {Client} from "./Client.mts";

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
