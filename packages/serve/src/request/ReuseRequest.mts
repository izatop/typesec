import {xmap} from "@typesec/core";
import type {BunRequest} from "bun";

const cache = xmap(new WeakMap<Request, ReuseRequest>());

export class ReuseRequest {
    #text: Promise<string> | null = null;

    readonly #request: BunRequest;

    constructor(request: BunRequest) {
        this.#request = request;
    }

    public static factory(req: BunRequest): ReuseRequest {
        return cache.ensure(req, () => new this(req));
    }

    public get request(): BunRequest {
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
