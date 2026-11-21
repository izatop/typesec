import type {Fn} from "@typesec/the";

import type {ServiceRef} from "./ServiceRef.mjs";

/**
 * Marker for a service; any object qualifies.
 * @category service
 */
export interface IService {}

/**
 * Anything the container can hold, including something it must dispose on shutdown.
 * @category service
 */
export type Service = IService | AsyncDisposable | Disposable;

/**
 * A public constructor used as a service identity.
 * @category service
 */
export type ServiceCtor<T extends Service> = {
    new (...args: any[]): T;
    name: string;
};

/**
 * A class with a private constructor, still usable as a service identity.
 * @category service
 */
export type ServicePrivateCtor<T extends Service> = Function & {
    prototype: T;
    name: string;
};

/**
 * How a service is addressed: by its class or by the ref `service` returned.
 * @category service
 */
export type ServiceId<T extends Service> = ServicePrivateCtor<T> | ServiceCtor<T> | ServiceRef<T>;

/**
 * The instance type behind a service identity.
 * @category service
 */
export type ServiceInfer<T> = T extends ServiceId<infer V> ? V : never;

/**
 * How an instance is produced: a factory function returning the instance or a promise of it, or the instance itself. A
 * promise or another thenable is refused; wrap it in a function.
 * @category service
 */
export type ServiceFactory<T extends Service> =
    | (T extends {then: (...args: never[]) => unknown} ? never : T)
    | Fn<[], T | PromiseLike<T>>;

/**
 * Registration options: an explicit constructor identity, and whether to defer construction.
 * @category service
 */
export type ServiceOptions<T extends Service> = {
    ctor?: ServiceCtor<T>;
    lazy?: boolean;
};

/**
 * A registration that has not produced its instance yet.
 * @category service
 */
export type ServiceStateKnown = {
    known: boolean;
    resolved: false;
};

/**
 * A registration that has not produced its instance yet.
 * @category service
 * @deprecated misspelled, use `ServiceStateKnown`
 */
export type ServiceStateKnonwn = ServiceStateKnown;

/**
 * A registration holding a built instance.
 * @category service
 */
export type ServiceStateResolved<T extends Service> = {
    known: true;
    resolved: true;
    instance: T;
};

/**
 * Whether a service is registered, and whether it is built.
 * @category service
 */
export type ServiceState<T extends Service> = ServiceStateKnown | ServiceStateResolved<T>;
