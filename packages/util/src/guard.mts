function isString(value: unknown): value is string {
    return typeof value === "string";
}

export const guard = {
    isString,
};
