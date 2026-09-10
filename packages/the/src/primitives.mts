import type {Fn, Rec} from "@typesec/the";

/**
 * The shape of the `primitives` sample set.
 * @category testing
 */
export type PrimitiveList = {
    Object: Rec;
    /** @deprecated misspelled, use `Object` */
    Objec: Rec;
    Array: any[];
    Float: number;
    Number: number;
    BigInt: bigint;
    True: true;
    False: false;
    String: string;
    Closure: Fn;
    Function: Fn;
};

const empty: Rec = {};

/**
 * One sample value per JavaScript type, for exercising guards against every kind of input.
 *
 * Intended for tests: iterate the record and assert which entries a guard accepts.
 * @category testing
 */
export const primitives: PrimitiveList = {
    /** An empty plain object. */
    Object: empty,
    /**
     * An empty plain object.
     * @deprecated misspelled, use `primitives.Object`
     */
    Objec: empty,
    /** An empty array. */
    Array: [],
    /** A non-integer number. */
    Float: 1.1,
    /** An integer number. */
    Number: 1,
    /** A bigint. */
    BigInt: 1n,
    /** The boolean `true`. */
    True: true,
    /** The boolean `false`. */
    False: false,
    /** A non-empty string. */
    String: "Hello, tests!",
    /** An anonymous arrow function. */
    Closure: () => void 0,
    /** A named function expression. */
    Function: function named() {},
};
