import type {Arrayify} from "@typesec/the/type";

export type Primitive = string | boolean | number;
export type PrimitiveAny = Arrayify<Primitive | null>;
