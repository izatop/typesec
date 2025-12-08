import z from "zod";
import type {ProcedureHandler} from "../interfaces.mts";
import type {Contract} from "./Contract.mts";

export class Procedure<TContext, TIn extends z.ZodType, TOut extends z.ZodType> {
    readonly #contract: Contract<TIn, TOut>;
    readonly #handler: ProcedureHandler<TContext, TIn, TOut>;

    constructor(contract: Contract<TIn, TOut>, handler: ProcedureHandler<TContext, TIn, TOut>) {
        this.#contract = contract;
        this.#handler = handler;
    }

    public async encode(raw: unknown, context: TContext): Promise<z.input<TOut>> {
        const {
            config: {input, output},
        } = this.#contract;

        const result = await this.#handler({
            context,
            input: input.parse(raw),
        });

        return output.encode(result);
    }

    public async run(input: z.output<TIn>, context: TContext): Promise<z.output<TOut>> {
        return await this.#handler({context, input});
    }
}
