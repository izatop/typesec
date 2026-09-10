import type {BunRequest} from "bun";

const cache = new WeakMap<Request, ReuseRequest>();

/**
 * Wraps a request so its body can be read more than once.
 *
 * A `Request` body is a one-shot stream, and several transforms may need it; this caches the text and serves every later read from that.
 * @category http
 */
export class ReuseRequest {
    #text: Promise<string> | null = null;

    readonly #request: BunRequest;

    constructor(request: BunRequest) {
        this.#request = request;
    }

    /** The wrapper for a request, one per request. */
    public static factory(req: BunRequest): ReuseRequest {
        return cache.getOrInsertComputed(req, () => new this(req));
    }

    /** The wrapped request. */
    public get request(): BunRequest {
        return this.#request;
    }

    /** Request headers. */
    public get headers(): Headers {
        return this.#request.headers;
    }

    /** Request URL. */
    public get url(): string {
        return this.#request.url;
    }

    /** Request method. */
    public get method(): string {
        return this.#request.method;
    }

    /** The body as text, read once and cached. */
    public text(): Promise<string> {
        return this.#text === null ? this.#reuseText() : this.#text;
    }

    /** The body parsed as JSON, over the cached text. */
    public json(): Promise<unknown> {
        return this.text().then((res) => JSON.parse(res));
    }

    #reuseText(): Promise<string> {
        return (this.#text = this.#request.text());
    }
}
