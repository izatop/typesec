import type {Service, ServiceCtor, ServiceId, ServicePrivateCtor} from "./interfaces.mjs";

const ServiceRefSymbol = Symbol();

export class ServiceRef<T extends Service> {
    readonly [ServiceRefSymbol] = true;

    readonly #ctor: ServiceCtor<T> | ServicePrivateCtor<T>;

    constructor(ctor: ServiceCtor<T> | ServicePrivateCtor<T>) {
        this.#ctor = ctor;
    }

    public get ctor(): ServiceCtor<T> | ServicePrivateCtor<T> {
        return this.#ctor;
    }

    public static is<T extends Service>(id: ServiceId<T>): id is ServiceRef<T> {
        return id instanceof this;
    }
}
