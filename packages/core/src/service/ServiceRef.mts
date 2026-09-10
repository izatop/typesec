import type {Service, ServiceCtor, ServiceId, ServicePrivateCtor} from "./interfaces.mjs";

const ServiceRefSymbol = Symbol();

/**
 * The handle `service` returns, addressing one registration.
 * @category service
 */
export class ServiceRef<T extends Service> {
    readonly [ServiceRefSymbol] = true;

    readonly #ctor: ServiceCtor<T> | ServicePrivateCtor<T>;

    constructor(ctor: ServiceCtor<T> | ServicePrivateCtor<T>) {
        this.#ctor = ctor;
    }

    /** The constructor this ref stands for. */
    public get ctor(): ServiceCtor<T> | ServicePrivateCtor<T> {
        return this.#ctor;
    }

    /** Whether an identity is already a ref rather than a constructor. */
    public static is<T extends Service>(id: ServiceId<T>): id is ServiceRef<T> {
        return id instanceof this;
    }
}
