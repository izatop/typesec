import {fn, type Fn, type Promisify} from "@typesec/the";

function uniq<T>(values: T[]): T[];
function uniq<T, R>(values: T[], map: (value: T) => R): R[];
function uniq(values: any[], map?: Fn<[any], any>): any[] {
    return [...new Set(map ? values.map(map) : values).values()];
}

function arraify<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
}

function dearraify<T>(value: T | T[]): T | undefined {
    return Array.isArray(value) ? value[0] : value;
}

async function asyncShift<T>(input: Promisify<T[]> | Fn<[], Promisify<T[]>>): Promise<T | undefined> {
    const [first] = await (fn.is(input, "function") ? input() : input);

    return first;
}

function group<T, R>(values: T[], by: (value: T) => R): Map<R, T[]> {
    const groups = new Map<R, T[]>();
    for (const value of values) {
        const key = by(value);
        const group = groups.getOrInsertComputed(key, () => []);
        group.push(value);
    }

    return groups;
}

export const array = {
    uniq,
    arraify,
    dearraify,
    group,
    async: {
        shift: asyncShift,
    },
};
