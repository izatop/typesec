export class ReuseRequest {
    #text: string | null = null;

    readonly #request: Request;

    constructor(request: Request) {
        this.#request = request;
    }

    public get request(): Request {
        return this.#request;
    }

    public get headers(): Headers {
        return this.#request.headers;
    }

    public get url(): string {
        return this.#request.url;
    }

    public async text(): Promise<string> {
        return this.#text === null ? this.#reuseText() : this.#text;
    }

    public async json(): Promise<unknown> {
        const text = await this.text();

        return JSON.parse(text);
    }

    async #reuseText(): Promise<string> {
        this.#text = await this.#request.text();

        return this.#text;
    }
}
