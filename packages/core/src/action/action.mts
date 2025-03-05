import {Action} from "./interfaces.mjs";

export function action<P, R>(config: Action<P, R>): Action<P, R> {
    return config;
}
