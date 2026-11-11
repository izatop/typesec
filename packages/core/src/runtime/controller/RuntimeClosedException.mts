import {ApplicationException} from "@typesec/the/errors";
import type {RuntimeController} from "./RuntimeController.mjs";

/**
 * Raised when a resource is registered with a controller that has begun closing.
 * @category exception
 */
export class RuntimeClosedException extends ApplicationException {
    /** Await this controller's close() outside its own disposer to observe the current cleanup batch. */
    public readonly controller: RuntimeController;

    /** Keeps the rejected registration's controller available for observing cleanup. */
    public constructor(controller: RuntimeController) {
        super("Runtime controller is closing or closed");

        this.controller = controller;
    }
}
