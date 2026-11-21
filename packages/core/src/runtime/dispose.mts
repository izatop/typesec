import {identify} from "@typesec/the";

import {isAsyncDisposable, isDisposable} from "../lib/dispostable.mjs";
import {tracer} from "../tracer.mjs";

/**
 * Disposes a value, preferring `AsyncDisposable` over `Disposable`, and ignores anything else.
 * @category runtime
 */
export async function dispose(res: unknown): Promise<void> {
    if (isAsyncDisposable(res)) {
        await using dispose = res;
        tracer.log("dispose( <%s> )", identify(dispose));
    } else if (isDisposable(res)) {
        using dispose = res;
        tracer.log("dispose( <%s> ):", identify(dispose));
    }
}
