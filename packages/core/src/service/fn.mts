import {defnify, identify, type Fn} from "@typesec/the";
import {assert} from "@typesec/the/assert";
import {async} from "@typesec/the/async";
import {fn, is} from "@typesec/the/fn";
import {task} from "@typesec/the/task";
import {isAsyncDisposable, isDisposable, toAsyncDisposable} from "../lib/dispostable.mjs";
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
import {registration} from "./registration.mjs";
import {ServiceEntry} from "./ServiceEntry.mjs";
import {ServiceRef} from "./ServiceRef.mjs";

const entries = new Map<ServiceRef<any>, ServiceEntry<any>>();

// The root's registrations that build at once, in registration order, which `main` and a top-level `runtime.run` wait
// for before their task.
const eager = new Set<ServiceEntry<any>>();

const latest = new WeakMap<ServiceCtor<any> | ServicePrivateCtor<any>, ServiceRef<any>>();

// The factory's own result behind each build, which still carries the instance when a closing owner refuses it.
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
 * A function is the factory and returns the instance or a promise of it; any other value is the instance itself. A
 * promise or another thenable is refused. A lazy factory builds on first resolve; `lazy: false` starts it at once,
 * and `main` and a `runtime.run` called from outside every controller wait for that build before their task, so it
 * must settle without the task's help.
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
    return register(lifecycle, ctor, value, lazy);
}

/**
 * Registers a service owned by `owner`; `service()` passes the generation root, `controller.service()` a child.
 *
 * Only the root's registrations answer class lookup. A child's registration is reached through its ref and forgotten
 * once the child has disposed what it owns.
 */
function register<T extends Service>(
    owner: RuntimeController,
    ctor: ServiceCtor<NoInfer<T>> | ServicePrivateCtor<NoInfer<T>>,
    value: ServiceFactory<T>,
    lazy: boolean,
): ServiceRef<T> {
    assert(owner.isRunning(), () => new RuntimeClosedException(owner));
    assert(
        !async.isThenable(value),
        `Service ${identify(ctor)} is registered with a promise or thenable; pass a factory`,
    );

    const ref = new ServiceRef(ctor);
    const entry = new ServiceEntry(value, owner);

    // Owned before the instance, so the child forgets the entry only after disposing what the entry holds.
    const forget = owner === lifecycle ? undefined : owner.own(toAsyncDisposable(() => forgetAfter(ref, entry)));

    // A value is adopted before it is recorded; a refused one takes its cleanup back and leaves nothing behind.
    if (!is(value, "function")) {
        try {
            entry.instance = adopt(entry, value as T);
        } catch (reason) {
            if (forget) void owner.release(forget);

            throw reason;
        }
    }

    entries.set(ref, entry);
    if (owner === lifecycle) {
        latest.set(ctor, ref);
    }

    if (is(value, "function") && !lazy) {
        if (owner === lifecycle) eager.add(entry);
        kickoff(ref);
    }

    return ref;
}

registration.register = register;

/**
 * Waits for the build each eager root registration holds now, in flight or failed, then rethrows the first failure in
 * registration order. It starts nothing: a built, lazy or unloaded and not yet resolved entry holds no build.
 */
async function warmup(): Promise<void> {
    const builds = [...eager].flatMap((entry) => (entry.pending ? [entry.pending] : []));
    for (const outcome of await Promise.allSettled(builds)) {
        if (outcome.status === "rejected") throw outcome.reason;
    }
}

registration.warmup = warmup;

/**
 * Drops a built instance and releases it through its owner, returning a promise for that single release attempt.
 *
 * Await it to observe completion and the disposer's failure. A concurrent unload joins the same attempt, an entry with
 * nothing to release resolves at once, and the next resolve waits for an unfinished release before rebuilding. Every
 * registration of the same owner that has published the same instance drops it too; a value registration has no
 * factory, so it stays unloaded for good. A build in flight is dropped as well: its callers still get its result,
 * which is then released instead of published, and a failed build is forgotten, so the next resolve calls the factory
 * again. An unknown reference rejects. Never resolve or unload a service from its own disposer or factory, directly
 * or through another service: the call waits for the release or build it is part of.
 * @category service
 */
export async function unload<T extends Service>(ref: ServiceId<T>): Promise<void> {
    const entry = entries.get(ensureRef(ref));
    if (entry?.instance) {
        drop(entry.owner, entry.instance);
    } else if (entry?.pending) {
        const build = entry.pending;
        entry.pending = undefined;

        // A closing owner still took the result before refusing it, so it is released from the factory's own result;
        // any other failure, such as a factory failure or another controller's instance, leaves nothing of ours.
        holdRelease(
            entry,
            build.then(
                (instance) => drop(entry.owner, instance),
                (reason) =>
                    reason instanceof RuntimeClosedException
                        ? results.get(build)!.then(
                              (instance) => drop(entry.owner, instance),
                              () => undefined,
                          )
                        : undefined,
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
    assert(is(value, "function"), `Service ${identify(ref.ctor)} was unloaded and has no factory`);

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

/**
 * Takes an instance out of every entry of the same owner holding it and releases a disposable one once; each entry
 * holds the attempt. Another owner's entry is never touched: a disposable cannot be shared across owners.
 */
function drop<T extends Service>(owner: RuntimeController, instance: T): Promise<void> | undefined {
    const attempt = isDisposable(instance) || isAsyncDisposable(instance) ? owner.release(instance) : undefined;
    for (const entry of entries.values()) {
        if (entry.owner === owner && entry.instance === instance) {
            entry.instance = undefined;
            if (attempt) holdRelease(entry, attempt);
        }
    }

    return attempt;
}

/**
 * Forgets a child's entry once its instance is disposed. An instance the child owned before this registration is
 * disposed later in the drain, so the entry waits for that disposal without holding the drain up.
 */
function forgetAfter<T extends Service>(ref: ServiceRef<T>, entry: ServiceEntry<T>): void {
    const instance = entry.instance;

    // Settling happens inside the instance entry's own cleanup, so the delete runs before the drain resumes.
    const disposal = isDisposable(instance) || isAsyncDisposable(instance) ? entry.owner.settled(instance) : undefined;
    if (disposal) {
        void disposal.then(() => entries.delete(ref));
    } else {
        entries.delete(ref);
    }
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
