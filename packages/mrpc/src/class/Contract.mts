import type z from "zod";
import type {ContractDomain} from "../interfaces.mts";

export class Contract<TIn extends z.ZodType, TOut extends z.ZodType> {
    #input: TIn;
    #output: TOut;

    constructor(input: TIn, output: TOut) {
        this.#input = input;
        this.#output = output;
    }

    public get config(): ContractDomain<TIn, TOut> {
        return {input: this.#input, output: this.#output};
    }

    public input<TNextInput extends z.ZodType>(input: TNextInput): Contract<TNextInput, TOut> {
        return new Contract(input, this.#output);
    }

    public output<TNextOutput extends z.ZodType>(output: TNextOutput): Contract<TIn, TNextOutput> {
        return new Contract(this.#input, output);
    }
}
