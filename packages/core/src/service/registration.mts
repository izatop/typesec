import type {RuntimeController} from "../runtime/controller/RuntimeController.mjs";
import type {Service, ServiceCtor, ServiceFactory, ServicePrivateCtor} from "./interfaces.mjs";
import type {ServiceRef} from "./ServiceRef.mjs";

/**
 * Registers a service owned by a controller.
 * @internal
 */
export type Register = <T extends Service>(
    owner: RuntimeController,
    ctor: ServiceCtor<NoInfer<T>> | ServicePrivateCtor<NoInfer<T>>,
    value: ServiceFactory<T>,
    lazy: boolean,
) => ServiceRef<T>;

/**
 * The registration the service registry installs when it loads. The controller reads it here instead of importing the
 * registry, whose `lifecycle` import would start the root before the controller class is initialized.
 * @internal
 */
export const registration: {register?: Register} = {};
