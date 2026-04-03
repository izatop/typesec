import {is} from "./fn.mjs";
import {isNull} from "./object.mjs";

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
