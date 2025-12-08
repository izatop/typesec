import {assert, object} from "@typesec/the";
import type {IClientProtocol, ProtocolRequest, ProtocolResponse} from "../interfaces.mts";

export class ClientFetchProtocol implements IClientProtocol {
    readonly #url: string;

    constructor(url: string) {
        this.#url = url;
    }

    public async query(request: ProtocolRequest): Promise<ProtocolResponse> {
        const res = await fetch(this.#url, {
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
