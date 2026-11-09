/**
 * Per-key counter, used to give runtime controllers distinct identifiers.
 * @category runtime
 */
export class WeakSequence {
    #sequence: number = 0;

    static readonly #map = new WeakMap<WeakKey, WeakSequence>();

    static readonly #factory = () => new WeakSequence();

    private constructor() {}

    /** Next number in the sequence bound to the given key. */
    public static increment(ref: WeakKey): number {
        return this.#map.getOrInsertComputed(ref, this.#factory).increment();
    }

    /** Next number in this sequence. */
    public increment(): number {
        return this.#sequence++;
    }
}
