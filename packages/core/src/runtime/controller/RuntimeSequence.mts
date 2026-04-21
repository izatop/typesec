export class RuntimeSequence {
    static #map = new WeakMap<WeakKey, RuntimeSequence>();

    #sequence: number = 0;

    static #factory = () => new RuntimeSequence();

    private constructor() {}

    public static increment(ref: WeakKey): number {
        return this.#map.getOrInsertComputed(ref, this.#factory).increment();
    }

    public increment(): number {
        return this.#sequence++;
    }
}
