import z from "zod";
import {ProcedureAbstract} from "./ProcedureAbstract.mts";

export class ProcedureAsync<TContext, TIn extends z.ZodType, TOut extends z.ZodType> extends ProcedureAbstract<
    TContext,
    TIn,
    TOut,
    Promise<z.output<TOut>>,
    Promise<z.input<TOut>>
> {
    public async encode(context: TContext, raw: unknown): Promise<z.input<TOut>> {
        const {
            config: {input, output},
        } = this.contract;

        const result = await this.handler({
            context,
            input: input.parse(raw),
        });

        return output.encode(result);
    }

    public async run(context: TContext, input: z.output<TIn>): Promise<z.output<TOut>> {
        return await this.handler({context, input});
    }
}
