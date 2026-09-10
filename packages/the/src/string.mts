import type {Nullable} from "@typesec/the";

/**
 * Case-insensitive comparison that tolerates `null` on either side.
 * @category string
 */
function cmp(a: Nullable<string>, b: Nullable<string>): boolean {
    return a?.toLowerCase() === b?.toLocaleLowerCase();
}

/**
 * Lowercases a string.
 * @category string
 */
function lower(value: string): string {
    return value.toLowerCase();
}

/**
 * Uppercases a string.
 * @category string
 */
function upper(value: string): string {
    return value.toUpperCase();
}

/**
 * String helpers.
 * @category string
 */
export const string = {
    cmp,
    lower,
    upper,
};
