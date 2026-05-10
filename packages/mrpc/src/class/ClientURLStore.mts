export class ClientURLStore {
    #url: string;

    constructor(url: string) {
        this.#url = url;
    }

    public get(): string {
        return this.#url;
    }
}
