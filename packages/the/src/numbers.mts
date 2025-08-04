import {is} from "./fn.mts";

export const numbers = {
    is(value: unknown): value is number {
        return is(value, "number") && !isNaN(value);
    },
    gt(value: unknown, n: number): value is number {
        return this.is(value) && value > n;
    },
    gte(value: unknown, n: number): value is number {
        return this.is(value) && value >= n;
    },
    lt(value: unknown, n: number): value is number {
        return this.is(value) && value < n;
    },
    lte(value: unknown, n: number): value is number {
        return this.is(value) && value <= n;
    },
};
