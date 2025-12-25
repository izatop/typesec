import type {Fnify, Promisify} from "@typesec/the";
import type {ServiceRef} from "./ServiceRef.mts";

export interface IService {}

export type Service = IService | AsyncDisposable | Disposable;

export type ServiceCtor<T extends Service> = {
    new (...args: any[]): T;
    name: string;
};

export type ServiceId<T extends Service> = ServiceCtor<T> | ServiceRef<T>;

export type ServiceFactory<T extends Service> = Fnify<Promisify<T>>;

export type ServiceOptions<T extends Service> = {
    ctor?: ServiceCtor<T>;
    lazy?: boolean;
};

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
