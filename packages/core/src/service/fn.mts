import type {Fn, Promisify} from "@typesec/the";
import {log} from "@typesec/tracer";
import assert from "node:assert";
import {isPromise} from "node:util/types";
import {isFunction} from "radash";
import {isAsyncDisposable, isDisposable, PendingServiceList} from "../index.mjs";
import {PendingService} from "./PendingService.mjs";
import type {Service, ServiceCtor, ServiceFactory, ServiceState} from "./interfaces.mjs";

const store = new WeakMap<ServiceCtor<any>, any>();
const registry = new Map<ServiceCtor<any>, ServiceFactory<any>>();
const pendings = new WeakMap<ServiceCtor<any>, Promisify<Service>>();
export const identify = (ctor: ServiceCtor<any>) => ctor.name;

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
    log("[service] sync(%s)", name);

    const known = store.get(ctor);
    if (!known) {
        log("[service] try(PendingService(%s))", name);
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
    log("[service] resolve(%s)", name);
    const known = store.get(ctor);
    if (known) {
        return known;
    }

    const value = registry.get(ctor);
    const factory = isPromise(value) ? () => value : value;
    assert(isFunction(factory) || isPromise(value), `Unknown service ${name}`);

    log("[service] factory(%s)", name);
    const pending = Promise.resolve(pendings.get(ctor) ?? factory());
    pendings.set(ctor, pending);

    log("[resolve] register(%s)", name);
    pending.then((instance) => {
        pendings.delete(ctor);
        store.set(ctor, instance);

        return instance;
    });

    return pending;
}

export async function locator<R>(fn: Fn<[], Promisify<R>>): Promise<R> {
    try {
        return await fn();
    } catch (reason) {
        if (reason instanceof PendingService) {
            await reason;

            return await fn();
        }

        throw reason;
    }
}
