import {xmap} from "@typesec/core";

const cache = xmap(new WeakMap<Request, ReuseRequest>());

export class ReuseRequest {
    #text: Promise<string> | null = null;

    readonly #request: Request;

    constructor(request: Request) {
        this.#request = request;
    }

    public static factory(req: Request) {
        return cache.ensure(req, () => new this(req));
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

    public get method(): string {
        return this.#request.method;
    }

    public text(): Promise<string> {
        return this.#text === null ? this.#reuseText() : this.#text;
    }

    public json(): Promise<unknown> {
        return this.text().then((res) => JSON.parse(res));
    }

    #reuseText(): Promise<string> {
        return (this.#text = this.#request.text());
    }
}
