import type {Service, ServiceCtor, ServiceId} from "./interfaces.mjs";

const ServiceRefSymbol = Symbol();

export class ServiceRef<T extends Service> {
    readonly [ServiceRefSymbol] = true;

    readonly #ctor: ServiceCtor<T>;

    constructor(ctor: ServiceCtor<T>) {
        this.#ctor = ctor;
    }

    public get ctor(): ServiceCtor<T> {
        return this.#ctor;
    }

    public static is<T extends Service>(id: ServiceId<T>): id is ServiceRef<T> {
        return id instanceof this;
    }
}
