export abstract class ProtoAbstract<TIn> {
    readonly #input: TIn;

    constructor(input: TIn) {
        this.#input = input;
    }

    public get input(): TIn {
        return this.#input;
    }
}
