import type {Arrayify} from "@typesec/the/type";

export type Primitives = string | boolean | number;
export type PrimitiveAny = Arrayify<Primitives | null>;
