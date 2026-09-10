/**
 * Awaits a promise and reports the outcome instead of throwing.
 * @category async
 */
async function settle<T>(pending: Promise<T>): Promise<PromiseSettledResult<T>> {
    try {
        const value = await pending;

        return {status: "fulfilled", value};
    } catch (reason) {
        return {status: "rejected", reason};
    }
}

/**
 * Awaits a promise and swallows its rejection, for work whose failure must not propagate.
 * @category async
 */
async function tolerant(pending: Promise<unknown>): Promise<void> {
    await settle(pending);
}

/**
 * `Promise.all` that keeps the tuple shape of its input.
 * @category async
 */
async function all<T extends readonly unknown[] | []>(values: T): Promise<{-readonly [P in keyof T]: Awaited<T[P]>}> {
    return Promise.all(values);
}

/**
 * Promise helpers that keep tuple types and contain failures.
 * @category async
 */
export const task = {
    all,
    tolerant,
    settle,
};
