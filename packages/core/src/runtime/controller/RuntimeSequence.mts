import {xmap} from "../../lib/xmap.mjs";

export class RuntimeSequence {
    static #map = xmap(new WeakMap<WeakKey, RuntimeSequence>(), () => new this());

    #sequence: number = 0;

    private constructor() {}

    public static increment(ref: WeakKey): number {
        return this.#map.ensure(ref).increment();
    }

    public increment(): number {
        return this.#sequence++;
    }
}
