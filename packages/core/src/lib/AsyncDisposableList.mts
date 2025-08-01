export class AsyncDisposableList {
    readonly #disposable = new Set<AsyncDisposable>();

    public use(disposable: AsyncDisposable) {
        this.#disposable.add(disposable);
    }

    public async dispose(): Promise<void> {
        const disposing = [];
        for (const disposable of this.#disposable.values()) {
            disposing.push(disposable[Symbol.asyncDispose]());
        }

        await Promise.all(disposing);
    }
}
