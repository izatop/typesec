import {object, type Fn} from "@typesec/the";

/**
 * A lazily-filled slot: the factory runs on first `ensure`, and `replace` swaps the value.
 * @category lib
 */
export class Ref<T> {
    /** The held value, or `null` until it is first produced. */
    ref: {value: T} | null = null;

    readonly #factory: Fn<[], T>;

    constructor(factory: Fn<[], T>) {
        this.#factory = factory;
    }

    /** Returns the value, producing it on first call. */
    public ensure(): T {
        if (object.isNull(this.ref)) {
            const value = this.#factory();
            this.ref = {value};
        }

        return this.ref.value;
    }

    /** Replaces the value, whether or not it was produced yet. */
    public replace(value: T) {
        this.ref = {value};
    }
}
