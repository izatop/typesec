import type {Fn, Promisify} from "@typesec/the";
import assert from "node:assert";
import {isFunction} from "radash";
import {isAsyncDisposable, isDisposable} from "../index.mjs";
import {PendingService} from "./PendingService.mjs";
import type {Service, ServiceCtor, ServiceFactory, ServiceState} from "./interfaces.mjs";

const store = new WeakMap();
const registry = new Map<ServiceCtor<any>, ServiceFactory<any>>();
const identify = (ctor: ServiceCtor<any>) => ctor.name;

export function service<T extends Service>(ctor: ServiceCtor<T>, factory: Fn<[], Promisify<T>>) {
    registry.set(ctor, factory);
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

export function sync<T extends Service>(ctor: ServiceCtor<T>): T {
    const known = store.get(ctor);
    if (!known) {
        throw new PendingService(ctor, resolve(ctor));
    }

    return known;
}

export async function resolve<T extends Service>(ctor: ServiceCtor<T>): Promise<T> {
    const known = store.get(ctor);
    if (known) {
        return known;
    }

    const factory = registry.get(ctor);
    assert(isFunction(factory), `Unknown service ${identify(ctor)}`);

    const instance = await factory();
    store.set(ctor, instance);

    return instance;
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
