import {assert} from "@typesec/the/assert";
import {is} from "@typesec/the/fn";
import {object} from "@typesec/the/object";
import type {IClientProtocol, ProtocolRequest, ProtocolResponse} from "../interfaces.mjs";
import {ClientURLStore} from "./ClientURLStore.mjs";

/**
 * A client transport over `fetch`, posting the query as JSON.
 * @category rpc
 * @example client(domain, new ClientFetchProtocol("/rpc"))
 */
export class ClientFetchProtocol implements IClientProtocol {
    readonly #url: ClientURLStore;

    constructor(url: string | ClientURLStore) {
        this.#url = is(url, "string") ? new ClientURLStore(url) : url;
    }

    /** Posts the query and returns the response, turning a transport failure into a reason rather than a throw. */
    public async query(request: ProtocolRequest): Promise<ProtocolResponse> {
        const res = await fetch(this.#url.get(), {
            body: JSON.stringify(request.query),
            method: "POST",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
            },
        });

        try {
            assert(res.status === 200, res.statusText ?? "Wrong status");

            const response = await res.json();
            assert(object.isPlain(response), "Wrong response");

            return {
                data: response.data,
                code: response.code,
                reason: response.reason,
            };
        } catch (reason) {
            return {
                code: res.status,
                data: null,
                reason: {
                    issues: [],
                    message: `${reason}`,
                },
            };
        }
    }
}
