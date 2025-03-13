import type {IProto} from "./interfaces.mjs";

export abstract class ProtoAbstract<TIn> implements IProto<TIn> {
    readonly #input: TIn;

    constructor(input: TIn) {
        this.#input = input;
    }

    public get input(): TIn {
        return this.#input;
    }
}
