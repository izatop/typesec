import z from "zod";
import {ProcedureAbstract} from "./ProcedureAbstract.mjs";

/**
 * A procedure whose handler returns a value directly.
 * @category rpc
 */
export class ProcedureSync<TContext, TIn extends z.ZodType, TOut extends z.ZodType> extends ProcedureAbstract<
    TContext,
    TIn,
    TOut,
    z.output<TOut>,
    z.input<TOut>
> {
    /** Validates the input, runs the handler, and encodes the result. */
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

    /** Runs the handler over validated input. */
    public run(context: TContext, input: z.output<TIn>): z.output<TOut> {
        return this.handler({context, input});
    }
}
