import type {Promisify} from "@typesec/the";
import type {Service, ServiceCtor} from "./interfaces.mjs";

export class PendingService<T extends Service> implements PromiseLike<T> {
    constructor(
        readonly ctor: ServiceCtor<T>,
        readonly pending: Promisify<T>,
    ) {}

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
    ): PromiseLike<TResult1 | TResult2> {
        return Promise.resolve(this.pending).then(onfulfilled, onrejected);
    }
}
