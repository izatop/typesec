import {type Promisify} from "@typesec/the";

export type MainFunctionReturns = Disposable | AsyncDisposable | undefined | null | void;

export type MainFunction = () => Promisify<MainFunctionReturns>;
