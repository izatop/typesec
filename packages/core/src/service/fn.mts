import {defnify, identify, type Fn, type Promisify} from "@typesec/the";
import {assert} from "@typesec/the/assert";
import {log} from "@typesec/tracer";
import {isPromise} from "node:util/types";
import {isFunction} from "radash";
import {isAsyncDisposable, isDisposable, PendingServiceList} from "../index.mjs";
import type {Service, ServiceCtor, ServiceFactory, ServiceState} from "./interfaces.mjs";
import {PendingError} from "./PendingError.mjs";
import {PendingService} from "./PendingService.mjs";

const store = new WeakMap<ServiceCtor<any>, any>();
const registry = new Map<ServiceCtor<any>, ServiceFactory<any>>();
const pendings = new WeakMap<ServiceCtor<any>, Promisify<Service>>();

export function service<T extends Service>(ctor: ServiceCtor<T>, value: ServiceFactory<T>, lazy = false) {
    registry.set(ctor, value);
    if (isFunction(value)) {
        !lazy && resolve(ctor);

        return;
    }

    if (isPromise(value)) {
        resolve(ctor);

        return;
    }

    store.set(ctor, value);
}

export function unload<T extends Service>(ctor: ServiceCtor<T>): void {
    const current = state(ctor);
    if (current.resolved) {
        store.delete(ctor);
        if (isAsyncDisposable(current.instance)) {
            current.instance[Symbol.asyncDispose]();
        }

        if (isDisposable(current.instance)) {
            current.instance[Symbol.dispose]();
        }
    }
}

export function state<T extends Service>(ctor: ServiceCtor<T>): ServiceState<T> {
    const known = registry.has(ctor);
    if (!known) {
        return {known, resolved: false};
    }

    const instance = store.get(ctor);

    return instance
        ? {
              known,
              instance,
              resolved: true,
          }
        : {
              known,
              resolved: false,
          };
}

export function syncArray<T1 extends Service, T2 extends Service>(t1: ServiceCtor<T1>, t2: ServiceCtor<T2>): [T1, T2];
export function syncArray<T1 extends Service, T2 extends Service, T3 extends Service>(
    t1: ServiceCtor<T1>,
    t2: ServiceCtor<T2>,
    t3: ServiceCtor<T3>,
): [T1, T2, T3];
export function syncArray<T1 extends Service, T2 extends Service, T3 extends Service, T4 extends Service>(
    t1: ServiceCtor<T1>,
    t2: ServiceCtor<T2>,
    t3: ServiceCtor<T3>,
    t4: ServiceCtor<T4>,
): [T1, T2, T3, T4];
export function syncArray<T extends Service>(...ctors: ServiceCtor<T>[]): T[] {
    const catches: PendingService<T>[] = [];
    const services: T[] = [];
    for (const ctor of ctors) {
        try {
            services.push(sync(ctor));
        } catch (reason) {
            if (reason instanceof PendingService) {
                catches.push(reason);
            } else {
                throw reason;
            }
        }
    }

    if (catches.length > 0) {
        throw new PendingServiceList(catches);
    }

    return services;
}

export function sync<T extends Service>(ctor: ServiceCtor<T>): T {
    const name = identify(ctor);
    log("[service] sync ( <%s>, <has=%s> )", name, store.has(ctor));

    const known = store.get(ctor);
    if (!known) {
        log("[service] throw ( <PendingService ( <%s> )> )", name);
        throw new PendingService(ctor, resolve(ctor));
    }

    return known;
}

export function resolveArray<T1 extends Service, T2 extends Service>(
    t1: ServiceCtor<T1>,
    t2: ServiceCtor<T2>,
): Promise<[T1, T2]>;
export function resolveArray<T1 extends Service, T2 extends Service, T3 extends Service>(
    t1: ServiceCtor<T1>,
    t2: ServiceCtor<T2>,
    t3: ServiceCtor<T3>,
): Promise<[T1, T2, T3]>;
export function resolveArray<T1 extends Service, T2 extends Service, T3 extends Service, T4 extends Service>(
    t1: ServiceCtor<T1>,
    t2: ServiceCtor<T2>,
    t3: ServiceCtor<T3>,
    t4: ServiceCtor<T4>,
): Promise<[T1, T2, T3, T4]>;
export function resolveArray<T extends Service>(...ctors: ServiceCtor<T>[]): Promise<T[]> {
    return Promise.all(ctors.map((ctor) => resolve(ctor)));
}

export function resolve<T extends Service>(ctor: ServiceCtor<T>): Promise<T> {
    const name = identify(ctor);
    log("[service] resolve ( <%s>, <has=%s> )", name, store.has(ctor));
    const known = store.get(ctor);
    if (known) {
        return known;
    }

    const value = registry.get(ctor);
    assert(isFunction(value) || isPromise(value), `Unknown service ${name}`);

    log("[service] factory ( <%s>, <reuse=%s> )", name, pendings.has(ctor));
    const pending = Promise.resolve(pendings.get(ctor) ?? defnify(value));
    pendings.set(ctor, pending);

    pending.then((instance) => {
        log("[resolve] register ( <%s> )", name);
        store.set(ctor, instance);
        pendings.delete(ctor);

        return instance;
    });

    return pending;
}

export async function locator<F extends Fn<[], any>>(fn: F): Promise<ReturnType<F>> {
    const name = fn.name ?? "fn";
    log("[service] locator ( <%s()> )", name);

    try {
        return await fn();
    } catch (reason) {
        if (reason instanceof PendingError) {
            log("[service] locator ( <await ( %s )> )", name);
            await reason;

            log("[service] locate ( <retry ( %s )> )", name);

            return await fn();
        }

        throw reason;
    }
}
