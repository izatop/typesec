import {Promisify} from "@typesec/the";

export type Action<P, R> = {
    name?: string;
    description?: string;
    run: (state: P) => Promisify<R>;
};

export interface IServiceFactory<T> {
    factory(): Promise<T>;
}
