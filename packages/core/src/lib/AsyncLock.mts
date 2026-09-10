/**
 * Runs at most one operation per key at a time.
 *
 * A second caller with the same key joins the promise already in flight instead of starting its own.
 * @category async
 */
export class AsyncLock {
    private static readonly map = new WeakMap<WeakKey, Promise<unknown>>();

    /** Runs the factory under the key, or returns the operation already running for it. */
    public static acquire<T>(key: WeakKey, factory: (release: () => void) => Promise<T>): Promise<T> {
        return this.map.getOrInsertComputed(key, () =>
            factory(() => this.release(key)).finally(() => this.release(key)),
        ) as Promise<T>;
    }

    /** Whether an operation is currently held for the key. */
    public static has(key: WeakKey) {
        return this.map.has(key);
    }

    private static release(key: WeakKey): void {
        this.map.delete(key);
    }
}
