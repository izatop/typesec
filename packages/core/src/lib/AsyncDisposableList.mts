/**
 * Collects async disposables and releases them together.
 * @category lib
 */
export class AsyncDisposableList {
    readonly #disposable = new Set<AsyncDisposable>();

    /** Adds a disposable to the set. */
    public use(disposable: AsyncDisposable) {
        this.#disposable.add(disposable);
    }

    /** Disposes everything in the set concurrently. */
    public async dispose(): Promise<void> {
        const disposing = [];
        for (const disposable of this.#disposable.values()) {
            disposing.push(disposable[Symbol.asyncDispose]());
        }

        await Promise.all(disposing);
    }
}
