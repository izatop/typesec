import {Backend} from "./class/Backend.mjs";
import {type ContextualBackend, type Domain, type Implementation} from "./interfaces.mjs";

export function backend<
    TContext,
    TDomain extends Domain<any, any>,
    TImpl extends Implementation<TContext, Domain.Infer<TDomain>>,
>(domain: TDomain, impl: TImpl): Backend<TContext, TDomain, TImpl> {
    return new Backend(domain, impl);
}

export function contextual<TContext>(): ContextualBackend<TContext> {
    return (domain, impl) => backend(domain, impl);
}
