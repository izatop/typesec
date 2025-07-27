import type {Nullable} from "@typesec/the";

function cmp(a: Nullable<string>, b: Nullable<string>): boolean {
    return a?.toLowerCase() === b?.toLocaleLowerCase();
}

function lower(value: string): string {
    return value.toLowerCase();
}

function upper(value: string): string {
    return value.toUpperCase();
}

export const string = {
    cmp,
    lower,
    upper,
};
