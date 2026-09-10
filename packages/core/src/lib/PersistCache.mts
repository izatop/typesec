import type {Fn, Promisify} from "@typesec/the";
import {Ref} from "./Ref.mjs";

/**
 * Produces the cached value, on first use and on every refresh.
 * @category cache
 */
export type CacheUpdater<T> = Fn<[], Promisify<T>>;

/**
 * A value computed once and refreshed on demand.
 *
 * `listen` re-runs the updater for every item an async iterator yields, which is how a cache follows an invalidation stream.
 * @category cache
 */
export class PersistCache<T> {
    readonly #updater: CacheUpdater<T>;
    readonly #ref: Ref<Promisify<T>>;

    constructor(updater: CacheUpdater<T>) {
        this.#updater = updater;
        this.#ref = new Ref(updater);
    }

    /** A cache backed by the given updater. */
    public static create<T>(updater: CacheUpdater<T>): PersistCache<T> {
        return new this(updater);
    }

    /** Whether the value has been produced at least once. */
    public isPersisted(): boolean {
        return this.#ref.ref !== null;
    }

    /** Refreshes the value on every item the iterator yields. */
    public async listen(iterator: AsyncIteratorObject<unknown>) {
        for await (const _ of iterator) {
            this.#ref.replace(this.#updater());
        }
    }

    /** The cached value, producing it on first call. */
    public async ensure(): Promise<T> {
        return this.#ref.ensure();
    }
}
