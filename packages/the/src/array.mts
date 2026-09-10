import {fn, type Fn, type Promisify} from "@typesec/the";

/**
 * Keeps the unique values, comparing the values themselves or the result of `map`.
 * @category collection
 * @example array.uniq(users, (user) => user.id)
 */
function uniq<T>(values: T[]): T[];
function uniq<T, R>(values: T[], map: (value: T) => R): R[];
function uniq(values: any[], map?: Fn<[any], any>): any[] {
    return [...new Set(map ? values.map(map) : values).values()];
}

/**
 * Wraps a lone value in an array, and leaves an array as it is.
 * @category collection
 */
function arraify<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
}

/**
 * Takes the first element of an array, or the value itself.
 * @category collection
 */
function dearraify<T>(value: T | T[]): T | undefined {
    return Array.isArray(value) ? value[0] : value;
}

/**
 * Awaits a list, or a thunk producing one, and returns its first element.
 * @category collection
 */
async function asyncShift<T>(input: Promisify<T[]> | Fn<[], Promisify<T[]>>): Promise<T | undefined> {
    const [first] = await (fn.is(input, "function") ? input() : input);

    return first;
}

/**
 * Groups values into a `Map` by a computed key.
 * @category collection
 * @example array.group(orders, (order) => order.status)
 */
function group<T, R>(values: T[], by: (value: T) => R): Map<R, T[]> {
    const groups = new Map<R, T[]>();
    for (const value of values) {
        const key = by(value);
        const group = groups.getOrInsertComputed(key, () => []);
        group.push(value);
    }

    return groups;
}

/**
 * Indexes values into a `Map` by a computed key, keeping the last value per key.
 * @category collection
 */
function map<T, R>(values: T[], by: (value: T) => R): Map<R, T> {
    const mapping = new Map<R, T>();
    for (const value of values) {
        mapping.set(by(value), value);
    }

    return mapping;
}

/**
 * Array helpers: deduplication, grouping, indexing.
 * @category collection
 */
export const array = {
    uniq,
    arraify,
    dearraify,
    group,
    map,
    /**
     * Array helpers that await their input.
     * @category collection
     */
    async: {
        shift: asyncShift,
    },
};
