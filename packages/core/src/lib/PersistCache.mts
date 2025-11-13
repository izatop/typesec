import type {Fn, Promisify} from "@typesec/the";
import {Ref} from "./Ref.mts";

export type CacheUpdater<T> = Fn<[], Promisify<T>>;

export class PersistCache<T> {
    readonly #updater: CacheUpdater<T>;
    readonly #ref: Ref<Promisify<T>>;

    constructor(updater: CacheUpdater<T>) {
        this.#updater = updater;
        this.#ref = new Ref(updater);
    }

    public async listen(iterator: AsyncIteratorObject<unknown>) {
        for await (const _ of iterator) {
            this.#ref.replace(this.#updater());
        }
    }

    public static create<T>(updater: CacheUpdater<T>): PersistCache<T> {
        return new this(updater);
    }

    public async ensure(): Promise<T> {
        return this.#ref.ensure();
    }
}
