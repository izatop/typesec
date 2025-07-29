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

export const task = {
    tolerant,
    settle,
};
