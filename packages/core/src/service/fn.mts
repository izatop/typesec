import {defnify, identify, type Fn, type Promisify} from "@typesec/the";
import {assert} from "@typesec/the/assert";
import {fn, is} from "@typesec/the/fn";
import {isPromise} from "node:util/types";
import {isAsyncDisposable, isDisposable, PendingServiceList} from "../index.mjs";
import {tracer} from "../tracer.mjs";
import {
    type Service,
    type ServiceCtor,
    type ServiceFactory,
    type ServiceId,
    type ServiceOptions,
    type ServicePrivateCtor,
    type ServiceState,
} from "./interfaces.mjs";
import {PendingError} from "./PendingError.mjs";
import {PendingService} from "./PendingService.mjs";
import {ServiceRef} from "./ServiceRef.mjs";

const store = new WeakMap<ServiceRef<any>, any>();
const registry = new Map<ServiceRef<any>, ServiceFactory<any>>();
const pendings = new WeakMap<ServiceRef<any>, Promisify<Service>>();
const latest = new WeakMap<ServiceCtor<any> | ServicePrivateCtor<any>, ServiceRef<any>>();

/**
 * Registers a service under a generated class identity, for a value with no class of its own.
 * @category service
 * @example define("config", () => loadConfig())
 */
export function define<T extends Service>(
    name: string,
    factory: ServiceFactory<T>,
    options?: ServiceOptions<NoInfer<T>>,
): ServiceRef<T> {
    const ctor = options?.ctor ?? (fn.named(name, class {}) as ServiceCtor<T>);

    return service(ctor, factory, options?.lazy);
}

/**
 * Registers how a service is built, keyed by its class.
 *
 * A lazy registration builds on first resolve; passing `lazy: false`, or a promise, starts construction at once.
 * @category service
 * @example service(Database, () => Database.connect(url))
 */
export function service<T extends Service>(
    ctor: ServiceCtor<NoInfer<T>> | ServicePrivateCtor<NoInfer<T>>,
    value: ServiceFactory<T>,
    lazy = true,
): ServiceRef<T> {
    const ref = new ServiceRef(ctor);
    registry.set(ref, value);
    latest.set(ctor, ref);
    if (is(value, "function")) {
        if (!lazy) resolve(ctor);

        return ref;
    }

    if (isPromise(value)) {
        resolve(ctor);

        return ref;
    }

    store.set(ref, value);

    return ref;
}

/**
 * Drops a built instance, disposing it first, so the next resolve rebuilds it.
 * @category service
 */
export function unload<T extends Service>(ref: ServiceId<T>): void {
    ref = ensureRef(ref);
    const current = state(ref);
    if (current.resolved) {
        store.delete(ref);
        if (isAsyncDisposable(current.instance)) {
            current.instance[Symbol.asyncDispose]();
        }

        if (isDisposable(current.instance)) {
            current.instance[Symbol.dispose]();
        }
    }
}

/**
 * Resolves any service identity to its ref, asserting the service is registered.
 * @category service
 */
export function ensureRef<T extends Service>(id: ServiceId<T>): ServiceRef<T> {
    const ref = ServiceRef.is(id) ? id : latest.get(id);
    assert(ref, `Unknown service reference ${id}`);

    return ref;
}

/**
 * Whether a service is registered and whether its instance exists yet.
 * @category service
 */
export function state<T extends Service>(ref: ServiceId<T>): ServiceState<T> {
    ref = ensureRef(ref);
    const known = registry.has(ref);
    if (!known) {
        return {known, resolved: false};
    }

    const instance = store.get(ref);

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

/**
 * Reads several services synchronously, throwing one `PendingServiceList` covering every one still unbuilt.
 * @category service
 */
export function syncArray<T1 extends Service, T2 extends Service>(t1: ServiceId<T1>, t2: ServiceId<T2>): [T1, T2];
export function syncArray<T1 extends Service, T2 extends Service, T3 extends Service>(
    t1: ServiceId<T1>,
    t2: ServiceId<T2>,
    t3: ServiceId<T3>,
): [T1, T2, T3];
export function syncArray<T1 extends Service, T2 extends Service, T3 extends Service, T4 extends Service>(
    t1: ServiceId<T1>,
    t2: ServiceId<T2>,
    t3: ServiceId<T3>,
    t4: ServiceId<T4>,
): [T1, T2, T3, T4];
export function syncArray<T extends Service>(...refs: ServiceId<T>[]): T[] {
    const catches: PendingService<T>[] = [];
    const services: T[] = [];
    for (const ref of refs) {
        try {
            services.push(sync(ref));
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

/**
 * Reads a built service without awaiting.
 *
 * Throws `PendingService` when the instance does not exist yet, which `locator` turns into a wait and a retry.
 * @category service
 */
export function sync<T extends Service>(ref: ServiceId<T>): T {
    ref = ensureRef(ref);
    const name = identify(ref);
    tracer.log("sync( <%s> ): %s", name, store.has(ref));

    const known = store.get(ref);
    if (!known) {
        tracer.log("throw PendingService( <%s> )", name);
        throw new PendingService(ref, resolve(ref));
    }

    return known;
}

/**
 * Resolves a list of services concurrently.
 * @category service
 */
export function resolveArray<T extends Service>(...refs: ServiceId<T>[]): Promise<T[]> {
    return Promise.all(refs.map((ref) => resolve(ref)));
}

/**
 * Resolves one or more services, building each on first use and caching the instance.
 * @category service
 * @example const [db, cache] = await resolve(Database, Cache)
 */
export function resolve<T extends Service>(ref: ServiceId<T>): Promise<T>;
export function resolve<T1 extends Service, T2 extends Service>(
    t1: ServiceId<T1>,
    t2: ServiceId<T2>,
): Promise<[T1, T2]>;
export function resolve<T1 extends Service, T2 extends Service, T3 extends Service>(
    t1: ServiceId<T1>,
    t2: ServiceId<T2>,
    t3: ServiceId<T3>,
): Promise<[T1, T2, T3]>;
export function resolve<T1 extends Service, T2 extends Service, T3 extends Service, T4 extends Service>(
    t1: ServiceId<T1>,
    t2: ServiceId<T2>,
    t3: ServiceId<T3>,
    t4: ServiceId<T4>,
): Promise<[T1, T2, T3, T4]>;
export function resolve<
    T1 extends Service,
    T2 extends Service,
    T3 extends Service,
    T4 extends Service,
    T5 extends Service,
>(
    t1: ServiceId<T1>,
    t2: ServiceId<T2>,
    t3: ServiceId<T3>,
    t4: ServiceId<T4>,
    t5: ServiceId<T5>,
): Promise<[T1, T2, T3, T4, T5]>;
export function resolve<
    T1 extends Service,
    T2 extends Service,
    T3 extends Service,
    T4 extends Service,
    T5 extends Service,
    T6 extends Service,
>(
    t1: ServiceId<T1>,
    t2: ServiceId<T2>,
    t3: ServiceId<T3>,
    t4: ServiceId<T4>,
    t5: ServiceId<T5>,
    t6: ServiceId<T5>,
): Promise<[T1, T2, T3, T4, T5, T6]>;
export async function resolve<T extends Service>(...refs: [ServiceId<T>, ...ServiceId<T>[]]): Promise<T | T[]> {
    if (refs.length > 1) {
        return resolveArray(...refs);
    }

    const ref = ensureRef(refs[0]);
    const name = identify(ref);

    tracer.log("resolve( <%s> ): %d", name, store.has(ref));
    const known = store.get(ref);
    if (known) {
        return known;
    }

    const value = registry.get(ref);
    assert(is(value, "function") || isPromise(value), `Unknown service ${name}`);

    tracer.log("factory( <%s> ): %d", name, pendings.has(ref));
    const pending = Promise.resolve(pendings.get(ref) ?? defnify(value));
    pendings.set(ref, pending);

    pending.then((instance) => {
        tracer.log("register( <%s> )", name);
        store.set(ref, instance);
        pendings.delete(ref);

        return instance;
    });

    return pending;
}

/**
 * Runs a function that reads services synchronously, retrying once whatever it needed is built.
 *
 * This is what makes `sync` usable inside a handler: the first attempt throws a pending service, the locator awaits it and runs the function again.
 * @category service
 * @example await locator(() => handle({context, request}))
 */
export async function locator<F extends Fn<[], any>>(fn: F): Promise<ReturnType<F>> {
    const id = identify(fn);
    tracer.log("locator( <%s> )", id);

    try {
        tracer.log("await %s()", id);
        return await fn();
    } catch (reason) {
        if (reason instanceof PendingError) {
            tracer.log("await PendingError<%s>", id);
            await reason;

            tracer.log("repeat <%s>", id);
            return await fn();
        }

        throw reason;
    }
}
