import {identify, type Promisify} from "@typesec/the";
import {log} from "@typesec/tracer";
import type {Service} from "./interfaces.mjs";
import {PendingError} from "./PendingError.mjs";
import type {ServiceRef} from "./ServiceRef.mjs";

/**
 * Raised by `sync` for a service whose construction is still in flight.
 * @category service
 */
export class PendingService<T extends Service> extends PendingError<T> {
    constructor(
        /** The service being built. */
        readonly ref: ServiceRef<T>,
        /** Its construction in flight, awaitable through this error. */
        readonly pending: Promisify<T>,
    ) {
        super();
    }

    /* oxlint-disable unicorn/no-thenable expected behavior */
    /** Awaits the service being built, so a caller can `await` the thrown pending value. */
    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
    ): PromiseLike<TResult1 | TResult2> {
        log("[PendingService]: then(%s)", identify(this.ref.ctor));

        return Promise.resolve(this.pending).then(onfulfilled, onrejected);
    }
}
