import type {KeyOf} from "@typesec/the";
import {ServeProto, type ServeInput} from "../index.mjs";
import type {RestTransforms} from "./interfaces.mjs";

/**
 * The protocol a route handler receives: an HTTP request plus the transforms the route declared.
 * @category http
 */
export class RestProto<TTransform extends RestTransforms> extends ServeProto {
    readonly #transforms: TTransform;

    constructor(input: ServeInput, schema: TTransform) {
        super(input);
        this.#transforms = schema;
    }

    /**
     * Runs one declared transform over the request and returns its parsed value.
     * @example proto.parse("args") // the key declared through Router.use
     */
    public parse<K extends KeyOf<TTransform, string>>(key: K): ReturnType<TTransform[K]> {
        return this.#transforms[key]?.(this.input);
    }
}
