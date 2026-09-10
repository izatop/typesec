import {identify} from "@typesec/the";
import {isAsyncDisposable, isDisposable} from "../index.mjs";
import {tracer} from "../tracer.mjs";

/**
 * Disposes a value when it implements `Disposable` or `AsyncDisposable`, and ignores anything else.
 * @category runtime
 */
export async function dispose(res: unknown): Promise<void> {
    if (isAsyncDisposable(res)) {
        await using dispose = res;
        tracer.log("dispose( <%s> )", identify(dispose));
    }

    if (isDisposable(res)) {
        using dispose = res;
        tracer.log("dispose( <%s> ):", identify(dispose));
    }
}
