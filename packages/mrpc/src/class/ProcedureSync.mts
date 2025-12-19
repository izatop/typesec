import z from "zod";
import {ProcedureAbstract} from "./ProcedureAbstract.mts";

export class ProcedureSync<TContext, TIn extends z.ZodType, TOut extends z.ZodType> extends ProcedureAbstract<
    TContext,
    TIn,
    TOut,
    z.output<TOut>,
    z.input<TOut>
> {
    public encode(context: TContext, raw: unknown): z.input<TOut> {
        const {
            config: {input, output},
        } = this.contract;

        const result = this.handler({
            context,
            input: input.parse(raw),
        });

        return output.encode(result);
    }

    public run(context: TContext, input: z.output<TIn>): z.output<TOut> {
        return this.handler({context, input});
    }
}
