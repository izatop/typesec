import {isFunction, type Fnify} from "@typesec/the";

function fnify<T>(value: Fnify<T>): T {
    return isFunction(value) ? value() : value;
}

function when<T>(value: unknown, returns: Fnify<T>): T | undefined {
    if (value) {
        return fnify(returns);
    }

    return;
}

export const util = {
    when,
    fnify,
};
