import type {Rec} from "@typesec/the";
import type {ArgvOption} from "./ArgvOption.mjs";

export type OptionPattern<T extends string> = `${string} <${T}>`;
export type ParseOptions<O extends Rec<string, ArgvOption<string, boolean>>> = {
    [K in keyof O]: O[K] extends ArgvOption<any, infer R> ? (R extends true ? string : string | undefined) : never;
};
