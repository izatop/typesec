import {log} from "@typesec/tracer";
import {isAsyncDisposable, isDisposable} from "../index.mjs";

export async function dispose(res: unknown): Promise<void> {
    if (isAsyncDisposable(res)) {
        await using dispose = res;
        log("dispose( <%o> )", dispose);
    }

    if (isDisposable(res)) {
        using dispose = res;
        log("dispose( <%o> ):", dispose);
    }
}
