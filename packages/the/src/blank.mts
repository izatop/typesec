import {is} from "./fn.mjs";
import {isNull} from "./object.mjs";

/**
 * The value kinds `isBlank` inspects.
 * @category guard
 */
export type BankTypeList = "string" | "number" | "object";

const validators = {
    string: (v: unknown) => is(v, "string") && v === "",
    object: (v: unknown) => {
        return is(v, "object")
            ? Array.isArray(v)
                ? v.every((v) => v === undefined)
                : isNull(v) || Object.keys(v).length === 0
            : false;
    },
};

/**
 * Whether a value carries no content: `undefined`, an empty string, `null`, an empty object, or an array of holes.
 *
 * Zero and `false` are content, so they are not blank.
 * @category guard
 */
export function isBlank(value: unknown) {
    const type = typeof value;

    switch (type) {
        case "undefined":
            return true;

        case "string":
        case "object":
            return validators[type](value);
    }

    return false;
}
