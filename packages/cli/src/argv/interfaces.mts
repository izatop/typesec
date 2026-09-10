import type {Rec} from "@typesec/the";
import type {ArgvOption} from "./ArgvOption.mjs";

/**
 * An option written as its flags followed by the value name, such as `-p, --port <port>`.
 * @category cli
 */
export type OptionPattern<T extends string> = `${string} <${T}>`;

/**
 * The parse result: a required option types as `string`, an optional one as `string | undefined`.
 * @category cli
 */
export type ParseOptions<O extends Rec<string, ArgvOption<string, boolean>>> = {
    [K in keyof O]: O[K] extends ArgvOption<any, infer R> ? (R extends true ? string : string | undefined) : never;
};
