import {is} from "./fn.mts";

export const numbers = {
    is(value: unknown): value is number {
        return is(value, "number") && !isNaN(value);
    },
    isFinite(value: unknown): value is number {
        return this.is(value) && Number.isFinite(value);
    },
    isInt(value: unknown): value is number {
        return Number.isSafeInteger(value);
    },
    gt(value: unknown, n: number): value is number {
        return this.is(value) && value > n;
    },
    gte(value: unknown, n: number): value is number {
        return this.gt(value, n - 1);
    },
    lt(value: unknown, n: number): value is number {
        return this.is(value) && value < n;
    },
    lte(value: unknown, n: number): value is number {
        return this.lt(value, n + 1);
    },
};
