/**
 * Thrown to say a service is still being built, and awaitable to wait for it.
 *
 * Being both an error and a thenable is what lets `sync` stay synchronous: a caller that cannot wait throws, and `locator` catches the throw, awaits it, and retries.
 * @category service
 */
export abstract class PendingError<T> implements PromiseLike<T> {
    /* oxlint-disable unicorn/no-thenable expected behavior */
    abstract then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
    ): PromiseLike<TResult1 | TResult2>;
}
