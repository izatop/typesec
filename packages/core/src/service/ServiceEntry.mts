import type {Service, ServiceFactory} from "./interfaces.mjs";

/**
 * An internal registration record: the factory and what it has built so far.
 * @internal
 */
export class ServiceEntry<T extends Service> {
    /** How the instance is produced. */
    public readonly factory: ServiceFactory<T>;

    /** The built instance, until `unload` drops it. */
    public instance?: T;

    /** The construction in flight. */
    public pending?: Promise<T>;

    /** Records a registration without building anything. */
    constructor(factory: ServiceFactory<T>) {
        this.factory = factory;
    }
}
