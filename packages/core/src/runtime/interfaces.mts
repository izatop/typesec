import {type Promisify} from "@typesec/the";

export type TaskReturns = Disposable | AsyncDisposable | undefined | null | void;

export type Task = () => Promisify<TaskReturns>;
