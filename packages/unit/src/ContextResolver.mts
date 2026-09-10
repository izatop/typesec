import {isFunction} from "radash";
import type {ContextFactory} from "./interfaces.mjs";

/**
 * Holds an application's resolved context, so the service container can cache it like any other service.
 * @category protocol
 */
export class ContextResolver<TContext> {
    readonly #context: TContext;

    constructor(context: TContext) {
        this.#context = context;
    }

    /** The resolved context. */
    public get context(): TContext {
        return this.#context;
    }

    /** Resolves a context factory, calling it and awaiting the result as needed. */
    public static async from<TContext>(context: ContextFactory<TContext>): Promise<ContextResolver<TContext>> {
        if (isFunction(context)) {
            return this.from(context());
        }

        return new this(await context);
    }
}
