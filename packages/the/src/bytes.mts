import type {KeyOf, Rec} from "./type.mts";

export type ByteUnit = "b" | "Kb" | "Mb" | "Gb" | "Tb" | "Pb";
export type ByteGrade = Rec<ByteUnit, number>;

const byteGrade: ByteGrade = {
    b: Math.pow(1, 1),
    Kb: Math.pow(2, 10),
    Mb: Math.pow(2, 20),
    Gb: Math.pow(2, 30),
    Tb: Math.pow(2, 40),
    Pb: Math.pow(2, 50),
};

function size<G extends KeyOf<ByteGrade, string>>(to: G, amount = 1) {
    return byteGrade[to] * amount;
}

export const bytes = {
    size,
};
