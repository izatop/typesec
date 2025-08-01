import {object, type Fn} from "@typesec/the";

export class Ref<T> {
    ref: {value: T} | null = null;

    readonly #factory: Fn<[], T>;

    constructor(factory: Fn<[], T>) {
        this.#factory = factory;
    }

    public ensure(): T {
        if (object.isNull(this.ref)) {
            const value = this.#factory();
            this.ref = {value};
        }

        return this.ref.value;
    }

    public replace(value: T) {
        this.ref = {value};
    }
}
