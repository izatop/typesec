async function settle<T>(pending: Promise<T>): Promise<PromiseSettledResult<T>> {
    try {
        const value = await pending;

        return {status: "fulfilled", value};
    } catch (reason) {
        return {status: "rejected", reason};
    }
}

async function tolerant(pending: Promise<unknown>): Promise<void> {
    await settle(pending);
}

async function all<T extends readonly unknown[] | []>(values: T): Promise<{-readonly [P in keyof T]: Awaited<T[P]>}> {
    return Promise.all(values);
}

export const task = {
    all,
    tolerant,
    settle,
};
