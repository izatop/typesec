import {is} from "./fn.mts";
import {isNull} from "./object.mts";

export type BankTypeList = "string" | "number" | "object";

const validators = {
    string: (v: unknown) => is(v, "string") && v === "",
    object: (v: unknown) => {
        return is(v, "object") ? (Array.isArray(v) ? v.length === 0 : isNull(v) || Object.keys(v).length === 0) : false;
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
