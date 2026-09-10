import type {KeyOf, Rec} from "./type.mjs";

/**
 * A binary size unit, each step 1024 times the previous one.
 * @category bytes
 */
export type ByteUnit = "b" | "Kb" | "Mb" | "Gb" | "Tb" | "Pb";
/**
 * The byte count of every unit.
 * @category bytes
 */
export type ByteGrade = Rec<ByteUnit, number>;

const byteGrade: ByteGrade = {
    b: Math.pow(1, 1),
    Kb: Math.pow(2, 10),
    Mb: Math.pow(2, 20),
    Gb: Math.pow(2, 30),
    Tb: Math.pow(2, 40),
    Pb: Math.pow(2, 50),
};

/**
 * The number of bytes in `amount` units.
 * @category bytes
 * @example bytes.size("Mb", 8) // 8388608
 */
function size<G extends KeyOf<ByteGrade, string>>(to: G, amount = 1) {
    return byteGrade[to] * amount;
}

/**
 * Binary size arithmetic.
 * @category bytes
 */
export const bytes = {
    size,
};
