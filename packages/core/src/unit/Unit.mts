import {log} from "@typesec/tracer";
import {Action} from "../action/interfaces.mjs";
import {isAsyncDisposable} from "../index.mjs";

export class Unit<C> {
    readonly #context: C;

    constructor(context: C) {
        this.#context = context;
    }

    public async run<P, R>(action: Action<P & C, R>, payload: P): Promise<R> {
        return Unit.run(action, {...payload, ...this.#context});
    }

    public static async run<P, R>(action: Action<P, R>, payload: P): Promise<R> {
        const {name = "action"} = action;

        try {
            log("run( %s, %o ): *resource", name, payload);

            const result = await action.run(payload);
            if (isAsyncDisposable(result)) {
                log("dispose( <%s> *resource )", name);

                await using resource = result;
            }

            return result;
        } catch (reason) {
            log("catch( <%s> *resource ): %s", name);

            throw reason;
        }
    }
}
