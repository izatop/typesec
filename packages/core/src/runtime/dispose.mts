import {identify} from "@typesec/the";
import {log} from "@typesec/tracer";
import {isAsyncDisposable, isDisposable} from "../index.mjs";

export async function dispose(res: unknown): Promise<void> {
    if (isAsyncDisposable(res)) {
        await using dispose = res;
        log("dispose( <%s> )", identify(dispose));
    }

    if (isDisposable(res)) {
        using dispose = res;
        log("dispose( <%s> ):", identify(dispose));
    }
}
