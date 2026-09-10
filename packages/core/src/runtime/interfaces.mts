import {type Promisify} from "@typesec/the";
import type {Fn} from "@typesec/the/type";

/**
 * What an entrypoint may return: nothing, or something the runtime disposes on shutdown.
 * @category runtime
 */
export type MainReturns = Disposable | AsyncDisposable | undefined | null | void;

/**
 * A unit of work the runtime can run inside a controller.
 * @category runtime
 */
export type Task<R> = Fn<[], Promisify<R>>;
/**
 * The entrypoint `main` runs.
 * @category runtime
 */
export type MainTask = Fn<[], Promisify<MainReturns>>;
