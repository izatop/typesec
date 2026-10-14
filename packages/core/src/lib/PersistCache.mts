import type {Fn} from "@typesec/the";
import {Ref, type RefReturn} from "./Ref.mjs";

/**
 * A synchronous, Promise, or PromiseLike updater called on first use and on every refresh; T is its return type.
 * @category cache
 */
export type CacheUpdater<T> = Fn<[], T>;

/**
 * A lazy cache accepting synchronous, Promise, or PromiseLike updaters; T is the updater's return type.
 *
 * ensure returns a synchronous value or a shared pending Promise, then the resolved value on later calls.
 * listen refreshes on each item from an async iterator. Updater failures are cached and thrown by ensure.
 * @category cache
 * @example PersistCache.create(() => 42).ensure()
 * @example await PersistCache.create(async () => 42).ensure()
 */
export class PersistCache<T> {
    readonly #ref: Ref<T>;

    /** Creates an empty cache with a synchronous or asynchronous updater; does not call it yet. */
    constructor(updater: CacheUpdater<T>) {
        this.#ref = new Ref(updater);
    }

    /** Creates a cache, inferring T from the synchronous, Promise, or PromiseLike updater result. */
    public static create<T>(updater: CacheUpdater<T>): PersistCache<T> {
        return new this(updater);
    }

    /** Whether a value or pending Promise is cached; false before first use or after an updater failure. */
    public isPersisted(): boolean {
        return this.#ref.persisted;
    }

    /** Starts a refresh on each iterator item without awaiting the updater; async failures are cached for ensure to throw. */
    public async listen(iterator: AsyncIteratorObject<unknown>) {
        for await (const _ of iterator) {
            this.#ref.update();
        }
    }

    /** Calls the updater on first use; returns the shared pending Promise or ready value, and throws a cached error synchronously. */
    public ensure(): RefReturn<T> {
        return this.#ref.ensure();
    }
}
