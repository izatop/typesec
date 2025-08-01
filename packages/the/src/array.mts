import type {Fn} from "@typesec/the";

function uniq<T>(values: T[]): T[];
function uniq<T, R>(values: T[], map: (value: T) => R): R[];
function uniq(values: any[], map?: Fn<[any], any>): any[] {
    return [...new Set(map ? values.map(map) : values).values()];
}

export const array = {
    uniq,
};
