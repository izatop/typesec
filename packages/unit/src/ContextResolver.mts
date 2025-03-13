import {isFunction} from "radash";
import type {ContextFactory} from "./interfaces.mjs";

export class ContextResolver<TContext> {
    readonly #context: TContext;

    constructor(context: TContext) {
        this.#context = context;
    }

    public get context(): TContext {
        return this.#context;
    }

    public static async from<TContext>(context: ContextFactory<TContext>): Promise<ContextResolver<TContext>> {
        if (isFunction(context)) {
            return this.from(context());
        }

        return new this(await context);
    }
}
