import z from "zod";
import {Contract} from "./class/Contract.mjs";

/**
 * Schemas for a contract; an omitted input rejects any argument, an omitted output returns nothing.
 * @category rpc
 */
export type ContractArgs<TInput extends z.ZodType, TOutput extends z.ZodType> = {
    input?: TInput;
    output?: TOutput;
};

/**
 * Declares one procedure's signature, which the backend and the client then share.
 * @category rpc
 * @example contract({input: z.string(), output: z.number()})
 */
export function contract<TInput extends z.ZodType, TOutput extends z.ZodType>(
    args: ContractArgs<TInput, TOutput>,
): Contract<TInput, TOutput> {
    return new Contract(args.input ?? z.never(), args.output ?? z.void()) as Contract<TInput, TOutput>;
}
