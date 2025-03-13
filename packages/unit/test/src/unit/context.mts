export type TestContext = {
    version: number;
};

export function createContext(): TestContext {
    return {version: 1};
}
