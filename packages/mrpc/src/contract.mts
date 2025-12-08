import z from "zod";
import {Contract} from "./class/Contract.mts";

export type ContractArgs<TInput extends z.ZodType, TOutput extends z.ZodType> = {
    input?: TInput;
    output?: TOutput;
};

export function contract<TInput extends z.ZodType, TOutput extends z.ZodType>(
    args: ContractArgs<TInput, TOutput>,
): Contract<TInput, TOutput> {
    return new Contract(args.input ?? z.never(), args.output ?? z.void()) as Contract<TInput, TOutput>;
}
