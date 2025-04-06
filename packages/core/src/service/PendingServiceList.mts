import type {Promisify} from "@typesec/the";
import {log} from "@typesec/tracer";
import type {PendingService} from "./PendingService.mjs";

export class PendingServiceList<T extends PendingService<any>> implements PromiseLike<T[]> {
    constructor(readonly pendings: Promisify<T>[]) {}

    public then<TResult1 = T[], TResult2 = never>(
        onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null | undefined,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
    ): PromiseLike<TResult1 | TResult2> {
        log("[PendingServiceList]: resolve(%d)", this.pendings.length);

        return Promise.all(this.pendings).then(onfulfilled, onrejected);
    }
}
