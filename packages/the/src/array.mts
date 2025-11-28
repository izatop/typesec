import {fn, type Fn, type Promisify} from "@typesec/the";

function uniq<T>(values: T[]): T[];
function uniq<T, R>(values: T[], map: (value: T) => R): R[];
function uniq(values: any[], map?: Fn<[any], any>): any[] {
    return [...new Set(map ? values.map(map) : values).values()];
}

function arraify<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
}

async function asyncShift<T>(input: Promisify<T[]> | Fn<[], Promisify<T[]>>): Promise<T | undefined> {
    const [first] = await (fn.is(input, "function") ? input() : input);

    return first;
}

export const array = {
    uniq,
    arraify,
    async: {
        shift: asyncShift,
    },
};
