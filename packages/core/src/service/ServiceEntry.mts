import type {RuntimeController} from "../runtime/controller/RuntimeController.mjs";
import type {Service, ServiceFactory} from "./interfaces.mjs";

/**
 * An internal registration record: the factory, its owner and what it has built so far.
 * @internal
 */
export class ServiceEntry<T extends Service> {
    /** How the instance is produced. */
    public readonly factory: ServiceFactory<T>;

    /** The controller whose context and signal the factory runs under. */
    public readonly owner: RuntimeController;

    /** The built instance, until `unload` drops it. */
    public instance?: T;

    /** The construction in flight. */
    public pending?: Promise<T>;

    /** Records a registration without building anything. */
    constructor(factory: ServiceFactory<T>, owner: RuntimeController) {
        this.factory = factory;
        this.owner = owner;
    }
}
