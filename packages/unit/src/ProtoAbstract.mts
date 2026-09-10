/**
 * Base of every protocol instance: it holds one request.
 *
 * A protocol subclass adds the accessors a handler uses to read that request, which is how HTTP and CLI share one entrypoint shape.
 * @category protocol
 */
export abstract class ProtoAbstract<TIn> {
    readonly #input: TIn;

    constructor(input: TIn) {
        this.#input = input;
    }

    /** The request this instance was built for. */
    public get input(): TIn {
        return this.#input;
    }
}
