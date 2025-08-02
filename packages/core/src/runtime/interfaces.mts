import {type Promisify} from "@typesec/the";
import type {Fn} from "@typesec/the/type";

export type MainReturns = Disposable | AsyncDisposable | undefined | null | void;

export type Task<R> = Fn<[], Promisify<R>>;
export type MainTask = Fn<[], Promisify<MainReturns>>;
