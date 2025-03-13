import {parse, parseAsync, type InferOutput} from "valibot";
import {ServeProto, type ServeInput} from "../index.mjs";
import type {RestSchema} from "./interfaces.mjs";

export class RestProto<TRest extends RestSchema> extends ServeProto {
    readonly #schema: TRest;

    constructor(input: ServeInput, schema: TRest) {
        super(input);
        this.#schema = schema;
    }

    public get params(): InferOutput<TRest["params"]> {
        return parse(this.#schema.params, this.input.route.params);
    }

    public get query(): InferOutput<TRest["query"]> {
        const url = new URL(this.input.request.url);

        return parse(this.#schema.query, Object.fromEntries(url.searchParams.entries()));
    }

    public body(): Promise<InferOutput<TRest["body"]>> {
        return parseAsync(this.#schema.body, this.input.request);
    }
}
