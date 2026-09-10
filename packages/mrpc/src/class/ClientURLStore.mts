/**
 * Holds the endpoint a fetch protocol posts to, so it can change without rebuilding the client.
 * @category rpc
 */
export class ClientURLStore {
    #url: string;

    constructor(url: string) {
        this.#url = url;
    }

    /** The current endpoint. */
    public get(): string {
        return this.#url;
    }
}
