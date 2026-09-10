import type z from "zod";
import type {ContractDomain} from "../interfaces.mjs";

/**
 * One procedure's signature: an input schema and an output schema.
 *
 * The backend validates against it and the client encodes and decodes with it, so both ends share one definition.
 * @category rpc
 */
export class Contract<TIn extends z.ZodType, TOut extends z.ZodType> {
    #input: TIn;
    #output: TOut;

    constructor(input: TIn, output: TOut) {
        this.#input = input;
        this.#output = output;
    }

    /** The input and output schemas. */
    public get config(): ContractDomain<TIn, TOut> {
        return {input: this.#input, output: this.#output};
    }

    /** A contract with a different input schema. */
    public input<TNextInput extends z.ZodType>(input: TNextInput): Contract<TNextInput, TOut> {
        return new Contract(input, this.#output);
    }

    /** A contract with a different output schema. */
    public output<TNextOutput extends z.ZodType>(output: TNextOutput): Contract<TIn, TNextOutput> {
        return new Contract(this.#input, output);
    }
}
