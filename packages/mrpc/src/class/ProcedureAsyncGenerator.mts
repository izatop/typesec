import z from "zod";
import type {ZodSubscription} from "../subscription.mts";
import {ProcedureAbstract} from "./ProcedureAbstract.mts";

export class ProcedureAsyncGenerator<
    TContext,
    TIn extends z.ZodType,
    TOut extends z.ZodType,
    ZSub extends ZodSubscription<TOut>,
> extends ProcedureAbstract<
    TContext,
    TIn,
    ZSub,
    AsyncIteratorObject<z.input<TOut>>,
    AsyncIterableIterator<z.output<TOut>>
> {
    public encode(context: TContext, raw: unknown): AsyncIterableIterator<z.output<TOut>> {
        const {
            config: {input, output},
        } = this.contract;

        const result = this.handler({
            context,
            input: input.parse(raw),
        });

        return output.encode(result as z.output<ZSub>) as AsyncIterableIterator<z.output<TOut>>;
    }

    public run(context: TContext, input: z.output<TIn>) {
        return this.handler({context, input});
    }
}
