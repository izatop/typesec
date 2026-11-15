import {defnify, identify, type Fn} from "@typesec/the";
import {assert} from "@typesec/the/assert";
import {fn, is} from "@typesec/the/fn";
import {task} from "@typesec/the/task";
import {isPromise} from "node:util/types";
import {isAsyncDisposable, isDisposable} from "../lib/dispostable.mjs";
import {lifecycle} from "../runtime/controller/lifecycle.mjs";
import {RuntimeClosedException} from "../runtime/controller/RuntimeClosedException.mjs";
import type {RuntimeController} from "../runtime/controller/RuntimeController.mjs";
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
import {PendingServiceList} from "./PendingServiceList.mjs";
import {ServiceEntry} from "./ServiceEntry.mjs";
import {ServiceRef} from "./ServiceRef.mjs";

const entries = new Map<ServiceRef<any>, ServiceEntry<any>>();
const latest = new WeakMap<ServiceCtor<any> | ServicePrivateCtor<any>, ServiceRef<any>>();

// The factory's own result behind each build, which still carries the instance when registration refuses it.
const results = new WeakMap<Promise<Service>, Promise<Service>>();

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
 * The factory runs as work of the generation's root controller, whichever context resolves the service first,
 * and a disposable instance is owned by that controller, which disposes it once when it closes. Once that controller
 * has begun closing, registration is refused with `RuntimeClosedException` and a result that lands late is released,
 * or dropped when it has no disposal hook, instead of published.
 * @category service
 * @example service(Database, () => Database.connect(url))
 */
export function service<T extends Service>(
    ctor: ServiceCtor<NoInfer<T>> | ServicePrivateCtor<NoInfer<T>>,
    value: ServiceFactory<T>,
    lazy = true,
): ServiceRef<T> {
    assert(lifecycle.isRunning(), () => new RuntimeClosedException(lifecycle));

    const ref = new ServiceRef(ctor);
    const entry = new ServiceEntry(value, lifecycle);
    entries.set(ref, entry);
    latest.set(ctor, ref);
    if (is(value, "function")) {
        if (!lazy) kickoff(ref);

        return ref;
    }

    if (isPromise(value)) {
        kickoff(ref);

        return ref;
    }

    entry.instance = adopt(entry, value as T);

    return ref;
}

/**
 * Drops a built instance and releases it through its owner, returning a promise for that single release attempt.
 *
 * Await it to observe completion and the disposer's failure. A concurrent unload joins the same attempt, an entry with
 * nothing to release resolves at once, and the next resolve waits for an unfinished release before rebuilding. Every
 * registration that has published the same instance drops it too; a value registration has no factory, so it stays
 * unloaded for good. A build in flight is dropped as well: its callers still get its result, which is then released
 * instead of published, and a failed build is forgotten, so the next resolve calls the factory again. An unknown
 * reference rejects. Never resolve or unload a service from its own disposer or factory, directly or through another
 * service: the call waits for the release or build it is part of.
 * @category service
 */
export async function unload<T extends Service>(ref: ServiceId<T>): Promise<void> {
    const entry = entries.get(ensureRef(ref));
    if (entry?.instance) {
        drop(entry.owner, entry.instance);
    } else if (entry?.pending) {
        const result = results.get(entry.pending)!;
        entry.pending = undefined;

        // Registration reacts to the result first, so the instance is owned, even by a closing owner, before release.
        holdRelease(
            entry,
            result.then(
                (instance) => drop(entry.owner, instance),
                () => undefined,
            ),
        );
    }

    return entry?.releasing;
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
    const entry = entries.get(ensureRef(ref));
    if (!entry) {
        return {known: false, resolved: false};
    }

    return entry.instance ? {known: true, instance: entry.instance, resolved: true} : {known: true, resolved: false};
}

/**
 * Reads several services synchronously, throwing one `PendingServiceList` covering every one still unbuilt.
 * @category service
 * @deprecated Read services with `await resolve()`. The throw-and-retry protocol behind `sync` only works under `locator`, and a call outside it breaks the handler.
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
 * @deprecated Read services with `await resolve()`. The throw-and-retry protocol behind `sync` only works under `locator`, and a call outside it breaks the handler.
 */
export function sync<T extends Service>(ref: ServiceId<T>): T {
    ref = ensureRef(ref);
    const name = identify(ref.ctor);
    const instance = entries.get(ref)?.instance;
    tracer.log("sync( <%s> ): %s", name, instance !== undefined);
    if (!instance) {
        tracer.log("throw PendingService( <%s> )", name);
        throw new PendingService(ref, resolve(ref));
    }

    return instance;
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
 *
 * A result that lands after the owner began closing is released, or dropped when it has no disposal hook, and never
 * published: that call and every later one reject with `RuntimeClosedException`, while a factory failure keeps its own
 * reason until `unload` forgets it. A build that `unload` dropped still settles its own callers but is not cached, and
 * the next call builds anew; an unloaded value registration rejects.
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
    const name = identify(ref.ctor);

    const entry = entries.get(ref);

    // A release still in flight finishes first; its failure belongs to the unload caller.
    if (entry?.releasing) {
        await task.tolerant(entry.releasing);
    }

    tracer.log("resolve( <%s> ): %d", name, entry?.instance !== undefined);
    if (entry?.instance) {
        return entry.instance;
    }

    assert(entry, `Unknown service ${name}`);

    const value = entry.factory;
    assert(is(value, "function") || isPromise(value), `Service ${identify(ref.ctor)} was unloaded and has no factory`);

    tracer.log("factory( <%s> ): %d", name, entry.pending !== undefined);
    if (!entry.pending) {
        const result = entry.owner.run(() => defnify(value));
        const build: Promise<T> = result.then((instance) => {
            tracer.log("register( <%s> )", name);
            const owned = adopt(entry, instance);
            assert(entry.owner.isRunning(), () => new RuntimeClosedException(entry.owner));

            // An unload during the build dropped it: the result goes to its callers and its release, not the entry.
            if (entry.pending === build) {
                entry.instance = owned;
                entry.pending = undefined;
            }

            return owned;
        });

        results.set(build, result);
        entry.pending = build;
    }

    return entry.pending;
}

/** Takes an instance out of every entry holding it and releases a disposable one once; each entry holds the attempt. */
function drop<T extends Service>(owner: RuntimeController, instance: T): Promise<void> | undefined {
    const attempt = isDisposable(instance) || isAsyncDisposable(instance) ? owner.release(instance) : undefined;
    for (const entry of entries.values()) {
        if (entry.instance === instance) {
            entry.instance = undefined;
            if (attempt) holdRelease(entry, attempt);
        }
    }

    return attempt;
}

/** Records a release in flight on the entry until it settles; the stored promise never goes unobserved. */
function holdRelease(entry: ServiceEntry<any>, releasing: Promise<void>): void {
    const clear = () => {
        if (entry.releasing === releasing) entry.releasing = undefined;
    };

    entry.releasing = releasing;
    releasing.then(clear, clear);
}

/** Hands a disposable instance to the entry's owner, which disposes it once; anything else has nothing to release. */
function adopt<T extends Service>(entry: ServiceEntry<T>, instance: T): T {
    return isDisposable(instance) || isAsyncDisposable(instance) ? entry.owner.own(instance) : instance;
}

/** Starts an eager build and observes it; a memoized rejection stays in the entry for the first `resolve`. */
function kickoff<T extends Service>(ref: ServiceRef<T>): void {
    resolve(ref).catch((reason) => tracer.error("kickoff( <%s> )", identify(ref.ctor), reason));
}

/**
 * Runs a function that reads services synchronously, retrying once whatever it needed is built.
 *
 * This is what makes `sync` usable inside a handler: the first attempt throws a pending service, the locator awaits it and runs the function again.
 * @category service
 * @deprecated Read services with `await resolve()` inside the handler instead of wrapping it; the retry re-runs the whole function.
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
