import type {KeyOf} from "../../../the/src/interfaces.mjs";
import {ServeProto, type ServeInput} from "../index.mjs";
import type {RestTransforms} from "./interfaces.mjs";

export class RestProto<TTransform extends RestTransforms> extends ServeProto {
    readonly #transforms: TTransform;

    constructor(input: ServeInput, schema: TTransform) {
        super(input);
        this.#transforms = schema;
    }

    public parse<K extends KeyOf<TTransform, string>>(key: K): ReturnType<TTransform[K]> {
        return this.#transforms[key](this.input);
    }
}
