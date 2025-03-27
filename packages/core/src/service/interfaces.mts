import type {Fn, Promisify} from "@typesec/the";

export interface IService {}

export type Service = IService | AsyncDisposable | Disposable;

export type ServiceCtor<T extends Service> = {
    new (...args: any[]): T;
    name: string;
};

export type ServiceFactory<T extends Service> = Fn<[], Promisify<T>>;

export type ServiceStateKnonwn = {
    known: boolean;
    resolved: false;
};

export type ServiceStateResolved<T extends Service> = {
    known: true;
    resolved: true;
    instance: T;
};

export type ServiceState<T extends Service> = ServiceStateKnonwn | ServiceStateResolved<T>;
