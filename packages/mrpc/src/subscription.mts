import {async} from "@typesec/the/async";
import z from "zod";

export type ZodSubscription<S extends z.ZodType> = z.ZodType<
    AsyncIterableIterator<z.output<S>>,
    AsyncIteratorObject<z.input<S>>
>;

export function subscription<S extends z.ZodType>(schema: S): ZodSubscription<S> {
    return z
        .custom<AsyncIteratorObject<z.input<S>>>((input) => {
            return async.isAsyncGenerator(input);
        })
        .transform<AsyncIterableIterator<z.output<S>>>((iterator) => {
            const _return = iterator.return;
            const _throw = iterator.throw;
            const $return = _return
                ? async (value?: unknown | PromiseLike<unknown>) => {
                      const input = await _return(value);

                      return input.done ? input : {value: schema.parse(input.value), done: input.done};
                  }
                : undefined;

            const $throw = _throw
                ? async (e?: any) => {
                      const input = await _throw(e);

                      return input.done ? input : {value: schema.parse(input.value), done: input.done};
                  }
                : undefined;

            return {
                throw: $throw,
                return: $return,
                next: async (...[value]: [] | [unknown]): Promise<IteratorResult<z.output<S>>> => {
                    const input = await iterator.next(...(value ? [value] : []));

                    return input.done ? input : {value: schema.parse(input.value), done: input.done};
                },
                [Symbol.asyncIterator](): AsyncIterableIterator<z.output<S>> {
                    return this;
                },
            } satisfies AsyncIterableIterator<z.output<S>>;
        });
}
