import type {Fn, Rec} from "@typesec/the";

export type PrimitiveList = {
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

export const primitives: PrimitiveList = {
    Objec: {},
    Array: [],
    Float: 1.1,
    Number: 1,
    BigInt: 1n,
    True: true,
    False: false,
    String: "Hello, tests!",
    Closure: () => void 0,
    Function: function named() {},
};
